import { error, json } from "@/lib/api/http";
import {
  assertBrowserOrigin,
  issueStartChallenge,
  requireChallengeRateLimit,
} from "@/lib/test-access";

export async function GET(request: Request) {
  const originError = assertBrowserOrigin(request);
  if (originError) return originError;

  const limited = requireChallengeRateLimit(request);
  if (limited) return limited;

  try {
    const payload = await issueStartChallenge();
    return json(payload);
  } catch {
    return error("Unable to issue start challenge", 500);
  }
}
