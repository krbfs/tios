import { error, json } from "@/lib/api/http";
import {
  assertBrowserOrigin,
  clientIp,
  consumeRateLimit,
  isHoneypotFilled,
  issueTestToken,
  redeemStartChallenge,
} from "@/lib/test-access";

type StartBody = {
  session_uuid?: string;
  challenge?: string;
  /** Honeypot — must be empty / absent. */
  website?: string;
};

export async function POST(request: Request) {
  const originError = assertBrowserOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);
  const limited = consumeRateLimit(`test:start:${ip}`, 40);
  if (!limited.ok) {
    return error("Too many requests. Try again later.", 429);
  }

  let body: StartBody = {};
  try {
    body = (await request.json()) as StartBody;
  } catch {
    // empty body
  }

  if (isHoneypotFilled(body.website)) {
    // Soft-fail: look like success to bots, do not issue a usable token.
    return json({ test_token: "invalid", expires_in_hours: 4 });
  }

  const challenge =
    typeof body.challenge === "string" ? body.challenge.trim() : "";
  if (!challenge) {
    return error("Start challenge required", 401);
  }

  const challengeError = await redeemStartChallenge(challenge);
  if (challengeError) return challengeError;

  let sessionUuid: string | undefined;
  if (typeof body.session_uuid === "string" && body.session_uuid.trim()) {
    sessionUuid = body.session_uuid.trim();
  }

  const headerSession = request.headers.get("x-session-uuid")?.trim();
  if (!sessionUuid && headerSession) {
    sessionUuid = headerSession;
  }

  const test_token = await issueTestToken(sessionUuid);
  return json({ test_token, expires_in_hours: 4 });
}
