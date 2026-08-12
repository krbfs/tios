import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

import { error } from "@/lib/api/http";

const JWT_ALG = "HS256";

function jwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(value ?? "dev-secret-change-me");
}

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "24h")
    .sign(jwtSecret());
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), jwtSecret());
    if (!payload.sub || typeof payload.email !== "string") {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return error("Unauthorized", 401);
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<AuthUser | Response> {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }
  if (user.role !== "admin") {
    return error("Forbidden", 403);
  }
  return user;
}
