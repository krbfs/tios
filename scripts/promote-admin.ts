#!/usr/bin/env node
/**
 * Create a new admin user or promote an existing user to admin.
 *
 * Usage:
 *   npm run db:promote-admin -- you@example.com
 *   npm run db:promote-admin -- you@example.com --password='your-password'
 */
import { hashPassword } from "../src/lib/api/auth";
import { db } from "../src/lib/db";

function usage(): never {
  console.error(`Usage:
  npm run db:promote-admin -- email@example.com
  npm run db:promote-admin -- email@example.com --password='min-8-chars'

If the user exists, only role is set to admin.
If not, --password is required to create the account.`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  const email = positional[0]?.trim().toLowerCase();
  const passwordFlag = argv.find((arg) => arg.startsWith("--password="));
  const password = passwordFlag?.slice("--password=".length);

  if (!email || !email.includes("@")) {
    usage();
  }

  return { email, password };
}

async function main() {
  const { email, password } = parseArgs(process.argv.slice(2));
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`Already admin: ${email}`);
      return;
    }

    await db.user.update({
      where: { email },
      data: { role: "admin" },
    });
    console.log(`Promoted to admin: ${email}`);
    return;
  }

  if (!password || password.length < 8) {
    console.error(
      `User ${email} not found. Pass --password='...' (min 8 chars) to create.`,
    );
    process.exit(1);
  }

  await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
    },
  });
  console.log(`Created admin: ${email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
