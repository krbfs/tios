import { SignJWT, jwtVerify } from "jose";

import { logAntibotEvent } from "@/lib/antibot-log";
import { error } from "@/lib/api/http";
import { rejectIfBlockedIp } from "@/lib/ip-blocklist";

const JWT_ALG = "HS256";
const TEST_TOKEN_TYP = "tios_test";
const CHALLENGE_TYP = "tios_challenge";
const TEST_TOKEN_TTL = "4h";
const CHALLENGE_TTL_SEC = 30 * 60;
const TEST_TOKEN_HEADER = "x-test-token";

/** Minimum time between challenge issue and /api/test/start redeem. */
export const START_MIN_DWELL_MS = 2_000;

/** Questions dump: page fetches per IP per hour (~3 full tests). */
const QUESTIONS_LIMIT = 45;
const SUBMIT_LIMIT = 20;
const CHALLENGE_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;
const USED_CHALLENGE_TTL_MS = CHALLENGE_TTL_SEC * 1000;

export const QUESTION_PAGE_SIZE = 5;
export const QUESTION_TOTAL = 75;
export const QUESTION_TOTAL_PAGES = QUESTION_TOTAL / QUESTION_PAGE_SIZE;

/** Hard floor for sum(time_per_question) — bots finish in seconds. */
export const MIN_TEST_SECONDS = 120;
/** Same bucket (0.1s) for this many answers → bot-like flat timing. */
const UNIFORM_TIMING_COUNT = 60;
/** Sub-0.5s answers share that triggers bot signal. */
const FAST_SHARE_LIMIT = 0.5;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();
const usedChallenges = new Map<string, number>();
/** token → highest page index successfully unlocked (inclusive). -1 = none yet. */
const questionPageUnlocked = new Map<string, number>();

function jwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(value ?? "dev-secret-change-me");
}

function pruneBuckets(now: number) {
  if (rateBuckets.size < 2_000) {
    return;
  }
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}

function pruneUsedChallenges(now: number) {
  if (usedChallenges.size < 2_000) {
    return;
  }
  for (const [jti, expiresAt] of usedChallenges) {
    if (expiresAt <= now) {
      usedChallenges.delete(jti);
    }
  }
}

function allowedHosts(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      hosts.add(new URL(site).hostname);
    } catch {
      // ignore bad env
    }
  }
  return hosts;
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  pruneBuckets(now);

  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/**
 * In production, require Origin or Referer from an allowed host.
 * Missing both is rejected (blocks bare curl/scripts). Local/test skips.
 */
export function assertBrowserOrigin(request: Request): Response | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const originHost = hostFromUrl(request.headers.get("origin"));
  const refererHost = hostFromUrl(request.headers.get("referer"));
  const host = originHost || refererHost;
  if (!host || !allowedHosts().has(host)) {
    const response = error("Invalid request origin", 403);
    logAntibotEvent(request, {
      event: "invalid_origin",
      status: 403,
      reason: "Invalid request origin",
    });
    return response;
  }
  return null;
}

export async function issueStartChallenge(options?: {
  /** Test helper: backdate iat so dwell is already satisfied. */
  ageMs?: number;
}): Promise<{ challenge: string; issued_at_ms: number; min_wait_ms: number }> {
  const nowMs = Date.now();
  const ageMs = Math.max(0, options?.ageMs ?? 0);
  const issuedAtSec = Math.floor((nowMs - ageMs) / 1000);
  const jti = crypto.randomUUID();

  const challenge = await new SignJWT({ typ: CHALLENGE_TYP })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(issuedAtSec)
    .setExpirationTime(issuedAtSec + CHALLENGE_TTL_SEC)
    .setJti(jti)
    .sign(jwtSecret());

  return {
    challenge,
    issued_at_ms: issuedAtSec * 1000,
    min_wait_ms: START_MIN_DWELL_MS,
  };
}

export async function redeemStartChallenge(
  challenge: string,
  request?: Request,
): Promise<Response | null> {
  const log = (payload: Parameters<typeof logAntibotEvent>[1]) => {
    if (request) logAntibotEvent(request, payload);
  };

  let payload;
  try {
    ({ payload } = await jwtVerify(challenge, jwtSecret()));
  } catch {
    log({
      event: "challenge_invalid",
      status: 401,
      reason: "Invalid or expired start challenge",
    });
    return error("Invalid or expired start challenge", 401);
  }

  if (payload.typ !== CHALLENGE_TYP) {
    log({
      event: "challenge_invalid",
      status: 401,
      reason: "Invalid challenge type",
    });
    return error("Invalid or expired start challenge", 401);
  }

  const iat = typeof payload.iat === "number" ? payload.iat : null;
  if (iat == null) {
    log({
      event: "challenge_invalid",
      status: 401,
      reason: "Missing challenge iat",
    });
    return error("Invalid or expired start challenge", 401);
  }

  const ageMs = Date.now() - iat * 1000;
  if (ageMs < START_MIN_DWELL_MS) {
    log({
      event: "challenge_dwell",
      status: 429,
      reason: "Challenge redeemed too early",
      dwell_ms: ageMs,
    });
    return error("Please wait a moment before starting the test", 429);
  }

  const jti = typeof payload.jti === "string" ? payload.jti : null;
  if (!jti) {
    log({
      event: "challenge_invalid",
      status: 401,
      reason: "Missing challenge jti",
    });
    return error("Invalid or expired start challenge", 401);
  }

  const now = Date.now();
  pruneUsedChallenges(now);
  if (usedChallenges.has(jti)) {
    log({
      event: "challenge_reused",
      status: 401,
      reason: "Start challenge already used",
    });
    return error("Start challenge already used", 401);
  }
  usedChallenges.set(jti, now + USED_CHALLENGE_TTL_MS);
  return null;
}

/** True when honeypot field was filled (bot signal). */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Reject scripted submit payloads: too short overall, or unnatural flat/fast timings.
 * `time_per_question` is in seconds (same as calculations / take.html).
 */
export function assertHumanLikeTimings(
  request: Request,
  timePerQuestion: readonly number[],
): Response | null {
  if (timePerQuestion.length !== 75) {
    return error("time_per_question must be an array of 75 numbers", 400);
  }

  for (const value of timePerQuestion) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return error("time_per_question must contain non-negative numbers", 400);
    }
  }

  const totalSeconds = timePerQuestion.reduce((sum, value) => sum + value, 0);
  if (totalSeconds < MIN_TEST_SECONDS) {
    const response = error(
      "Test completed too quickly. Please take the test more carefully.",
      429,
    );
    logAntibotEvent(request, {
      event: "timing_too_fast",
      status: 429,
      reason: "Total duration below minimum",
      total_seconds: totalSeconds,
      min_seconds: MIN_TEST_SECONDS,
      kind: "submit",
    });
    return response;
  }

  const fastShare =
    timePerQuestion.filter((seconds) => seconds < 0.5).length /
    timePerQuestion.length;
  if (fastShare > FAST_SHARE_LIMIT) {
    const response = error(
      "Suspicious answer timing detected. Please take the test more carefully.",
      429,
    );
    logAntibotEvent(request, {
      event: "timing_suspicious",
      status: 429,
      reason: "Too many sub-0.5s answers",
      fast_share: fastShare,
      kind: "submit",
    });
    return response;
  }

  const buckets = new Map<number, number>();
  for (const seconds of timePerQuestion) {
    const bucket = Math.round(seconds * 10) / 10;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const maxSame = Math.max(...buckets.values());
  if (maxSame >= UNIFORM_TIMING_COUNT) {
    const response = error(
      "Suspicious answer timing detected. Please take the test more carefully.",
      429,
    );
    logAntibotEvent(request, {
      event: "timing_suspicious",
      status: 429,
      reason: "Uniform answer timings",
      max_same_bucket: maxSame,
      kind: "submit",
    });
    return response;
  }

  const mean = totalSeconds / timePerQuestion.length;
  const variance =
    timePerQuestion.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    timePerQuestion.length;
  const std = Math.sqrt(variance);
  if (mean > 0 && mean < 8 && std / mean < 0.08) {
    const response = error(
      "Suspicious answer timing detected. Please take the test more carefully.",
      429,
    );
    logAntibotEvent(request, {
      event: "timing_suspicious",
      status: 429,
      reason: "Low timing variance",
      timing_cv: std / mean,
      kind: "submit",
    });
    return response;
  }

  return null;
}

export async function issueTestToken(sessionUuid?: string): Promise<string> {
  const builder = new SignJWT({ typ: TEST_TOKEN_TYP })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(TEST_TOKEN_TTL);

  if (sessionUuid) {
    builder.setSubject(sessionUuid);
  }

  return builder.sign(jwtSecret());
}

export async function verifyTestToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload.typ === TEST_TOKEN_TYP;
  } catch {
    return false;
  }
}

export function extractTestToken(request: Request): string | null {
  // Only X-Test-Token — never Authorization Bearer (that is the user access JWT).
  const header = request.headers.get(TEST_TOKEN_HEADER)?.trim();
  return header || null;
}

export async function requireTestAccess(
  request: Request,
  kind: "questions" | "submit",
): Promise<Response | null> {
  const blocked = await rejectIfBlockedIp(request);
  if (blocked) return blocked;

  const ip = clientIp(request);
  const limit = kind === "questions" ? QUESTIONS_LIMIT : SUBMIT_LIMIT;
  const limited = consumeRateLimit(`test:${kind}:${ip}`, limit);
  if (!limited.ok) {
    const response = error("Too many requests. Try again later.", 429);
    logAntibotEvent(request, {
      event: "rate_limit",
      status: 429,
      reason: "Too many requests",
      kind,
      retry_after_sec: limited.retryAfterSec,
    });
    return response;
  }

  const token = extractTestToken(request);
  if (!token) {
    const response = error("Test session required. Start the test from /test.", 401);
    logAntibotEvent(request, {
      event: "test_token_missing",
      status: 401,
      reason: "Missing X-Test-Token",
      kind,
    });
    return response;
  }

  const valid = await verifyTestToken(token);
  if (!valid) {
    const response = error("Invalid or expired test session", 401);
    logAntibotEvent(request, {
      event: "test_token_invalid",
      status: 401,
      reason: "Invalid or expired test session",
      kind,
    });
    return response;
  }

  return null;
}

export async function requireChallengeRateLimit(request: Request): Promise<Response | null> {
  const blocked = await rejectIfBlockedIp(request);
  if (blocked) return blocked;

  const ip = clientIp(request);
  const limited = consumeRateLimit(`test:challenge:${ip}`, CHALLENGE_LIMIT);
  if (!limited.ok) {
    const response = error("Too many requests. Try again later.", 429);
    logAntibotEvent(request, {
      event: "rate_limit",
      status: 429,
      reason: "Too many requests",
      kind: "challenge",
      retry_after_sec: limited.retryAfterSec,
    });
    return response;
  }
  return null;
}

/**
 * Pages must be fetched in order (0, then 1, …). Re-fetching earlier pages is OK.
 */
export function assertQuestionPageAccess(
  request: Request,
  token: string,
  page: number,
): Response | null {
  const unlocked = questionPageUnlocked.get(token) ?? -1;
  if (page > unlocked + 1) {
    const response = error("Complete previous question pages first", 403);
    logAntibotEvent(request, {
      event: "page_skip",
      status: 403,
      reason: "Question page fetched out of order",
      page,
      unlocked_page: unlocked,
      kind: "questions",
    });
    return response;
  }
  return null;
}

export function advanceQuestionPageAccess(token: string, page: number) {
  const unlocked = questionPageUnlocked.get(token) ?? -1;
  if (page === unlocked + 1) {
    questionPageUnlocked.set(token, page);
  }
}

/** Test helper: clear in-memory rate buckets and used challenges. */
export function resetTestAccessStateForTests() {
  rateBuckets.clear();
  usedChallenges.clear();
  questionPageUnlocked.clear();
}
