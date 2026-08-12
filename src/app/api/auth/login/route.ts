import { db } from "@/lib/db";
import { signAccessToken, verifyPassword } from "@/lib/api/auth";
import { attachSessionToUser } from "@/lib/api/session-link";
import { error, json, parseJson } from "@/lib/api/http";

type LoginBody = {
  email?: string;
  password?: string;
  session_uuid?: string;
};

export async function POST(request: Request) {
  const body = await parseJson<LoginBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return error("email and password are required", 400);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return error("Invalid credentials", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return error("Invalid credentials", 401);
  }

  const authUser = { id: user.id, email: user.email, role: user.role };
  const accessToken = await signAccessToken(authUser);

  const sessionUuid =
    request.headers.get("x-session-uuid") ?? body.session_uuid?.trim();
  await attachSessionToUser(user.id, sessionUuid);

  return json({
    access_token: accessToken,
    token_type: "Bearer",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
