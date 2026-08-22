import { SignJWT, jwtVerify } from "jose";

import { error } from "@/lib/api/http";

const JWT_ALG = "HS256";
const TEST_TOKEN_TYP = "tios_test";
const TEST_TOKEN_TTL = "4h";
const TEST_TOKEN_HEADER = "x-test-token";

const QUESTIONS_LIMIT = 30;
const SUBMIT_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

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

/** Test helper: clear in-memory rate buckets. */
export function resetTestAccessStateForTests() {
  rateBuckets.clear();
}
