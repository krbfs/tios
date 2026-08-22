import { SignJWT, jwtVerify } from "jose";

import { error } from "@/lib/api/http";

const JWT_ALG = "HS256";
const TEST_TOKEN_TYP = "tios_test";
const CHALLENGE_TYP = "tios_challenge";
const TEST_TOKEN_TTL = "4h";
const CHALLENGE_TTL_SEC = 30 * 60;
const TEST_TOKEN_HEADER = "x-test-token";

/** Minimum time between challenge issue and /api/test/start redeem. */
export const START_MIN_DWELL_MS = 2_000;

const QUESTIONS_LIMIT = 30;
const SUBMIT_LIMIT = 20;
const CHALLENGE_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;
const USED_CHALLENGE_TTL_MS = CHALLENGE_TTL_SEC * 1000;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();
const usedChallenges = new Map<string, number>();

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
    return error("Invalid request origin", 403);
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
): Promise<Response | null> {
  let payload;
  try {
    ({ payload } = await jwtVerify(challenge, jwtSecret()));
  } catch {
    return error("Invalid or expired start challenge", 401);
  }

  if (payload.typ !== CHALLENGE_TYP) {
    return error("Invalid or expired start challenge", 401);
  }

  const iat = typeof payload.iat === "number" ? payload.iat : null;
  if (iat == null) {
    return error("Invalid or expired start challenge", 401);
  }

  const ageMs = Date.now() - iat * 1000;
  if (ageMs < START_MIN_DWELL_MS) {
    return error("Please wait a moment before starting the test", 429);
  }

  const jti = typeof payload.jti === "string" ? payload.jti : null;
  if (!jti) {
    return error("Invalid or expired start challenge", 401);
  }

  const now = Date.now();
  pruneUsedChallenges(now);
  if (usedChallenges.has(jti)) {
    return error("Start challenge already used", 401);
  }
  usedChallenges.set(jti, now + USED_CHALLENGE_TTL_MS);
  return null;
}

/** True when honeypot field was filled (bot signal). */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
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
  const ip = clientIp(request);
  const limit = kind === "questions" ? QUESTIONS_LIMIT : SUBMIT_LIMIT;
  const limited = consumeRateLimit(`test:${kind}:${ip}`, limit);
  if (!limited.ok) {
    return error("Too many requests. Try again later.", 429);
  }

  const token = extractTestToken(request);
  if (!token) {
    return error("Test session required. Start the test from /test.", 401);
  }

  const valid = await verifyTestToken(token);
  if (!valid) {
    return error("Invalid or expired test session", 401);
  }

  return null;
}

export function requireChallengeRateLimit(request: Request): Response | null {
  const ip = clientIp(request);
  const limited = consumeRateLimit(`test:challenge:${ip}`, CHALLENGE_LIMIT);
  if (!limited.ok) {
    return error("Too many requests. Try again later.", 429);
  }
  return null;
}

/** Test helper: clear in-memory rate buckets and used challenges. */
export function resetTestAccessStateForTests() {
  rateBuckets.clear();
  usedChallenges.clear();
}
