import { error, json } from "@/lib/api/http";
import { logAntibotEvent } from "@/lib/antibot-log";
import {
  assertBrowserOrigin,
  clientIp,
  consumeRateLimit,
  isHoneypotFilled,
  issueTestToken,
  redeemStartChallenge,
} from "@/lib/test-access";
import { rejectIfBlockedIp } from "@/lib/ip-blocklist";
import { exportQuestionsKey } from "@/lib/questions-payload";

type StartBody = {
  session_uuid?: string;
  challenge?: string;
  /** Honeypot — must be empty / absent. */
  website?: string;
};

export async function POST(request: Request) {
  const blocked = await rejectIfBlockedIp(request);
  if (blocked) return blocked;

  const originError = assertBrowserOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);
  const limited = consumeRateLimit(`test:start:${ip}`, 40);
  if (!limited.ok) {
    const response = error("Too many requests. Try again later.", 429);
    logAntibotEvent(request, {
      event: "rate_limit",
      status: 429,
      reason: "Too many requests",
      kind: "start",
      retry_after_sec: limited.retryAfterSec,
    });
    return response;
  }

  let body: StartBody = {};
  try {
    body = (await request.json()) as StartBody;
  } catch {
    // empty body
  }

  if (isHoneypotFilled(body.website)) {
    logAntibotEvent(request, {
      event: "honeypot",
      status: 200,
      reason: "Honeypot field filled",
      kind: "start",
    });
    return json({ test_token: "invalid", expires_in_hours: 4 });
  }

  const challenge =
    typeof body.challenge === "string" ? body.challenge.trim() : "";
  if (!challenge) {
    const response = error("Start challenge required", 401);
    logAntibotEvent(request, {
      event: "challenge_missing",
      status: 401,
      reason: "Start challenge required",
      kind: "start",
    });
    return response;
  }

  const challengeError = await redeemStartChallenge(challenge, request);
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
  return json({
    test_token,
    questions_key: exportQuestionsKey(test_token),
    expires_in_hours: 4,
  });
}
