import { error, json } from "@/lib/api/http";
import { clientIp, consumeRateLimit, issueTestToken } from "@/lib/test-access";

type StartBody = {
  session_uuid?: string;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = consumeRateLimit(`test:start:${ip}`, 40);
  if (!limited.ok) {
    return error("Too many requests. Try again later.", 429);
  }

  let sessionUuid: string | undefined;
  try {
    const body = (await request.json()) as StartBody;
    if (typeof body?.session_uuid === "string" && body.session_uuid.trim()) {
      sessionUuid = body.session_uuid.trim();
    }
  } catch {
    // empty body is fine
  }

  const headerSession = request.headers.get("x-session-uuid")?.trim();
  if (!sessionUuid && headerSession) {
    sessionUuid = headerSession;
  }

  const test_token = await issueTestToken(sessionUuid);
  return json({ test_token, expires_in_hours: 4 });
}
