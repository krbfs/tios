import { db } from "@/lib/db";
import { hashPassword } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";

type RegisterBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = await parseJson<RegisterBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return error("email and password are required", 400);
  }
  if (password.length < 8) {
    return error("password must be at least 8 characters", 400);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return error("User with this email already exists", 409);
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return json(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt.toISOString(),
    },
    201,
  );
}
