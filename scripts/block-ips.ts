#!/usr/bin/env npx tsx
/**
 * Manage antibot IP blocklist (blocked_ips table).
 *
 * Usage:
 *   npx tsx scripts/block-ips.ts list
 *   npx tsx scripts/block-ips.ts add --ip 203.0.113.10 --reason "honeypot" --score 100
 *   npx tsx scripts/block-ips.ts remove --ip 203.0.113.10
 *   npx tsx scripts/block-ips.ts purge-expired
 */

import {
  blockIp,
  listBlockedIps,
  purgeExpiredBlockedIps,
  unblockIp,
} from "../src/lib/ip-blocklist";

function parseArgs(argv: string[]) {
  const command = argv[2] ?? "list";
  const flags: Record<string, string> = {};
  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = "true";
      }
    }
  }
  return { command, flags };
}

function requireIp(flags: Record<string, string>): string {
  const ip = flags.ip?.trim();
  if (!ip) {
    throw new Error("--ip is required");
  }
  return ip;
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  switch (command) {
    case "list": {
      const rows = await listBlockedIps();
      if (rows.length === 0) {
        console.log("No blocked IPs.");
        return;
      }
      for (const row of rows) {
        const score = row.score != null ? ` score=${row.score}` : "";
        const expires = row.expiresAt
          ? ` expires=${row.expiresAt.toISOString()}`
          : "";
        console.log(
          `${row.ip}  source=${row.source}${score}  blocked=${row.blockedAt.toISOString()}${expires}  ${row.reason}`,
        );
      }
      return;
    }
    case "add": {
      const ip = requireIp(flags);
      const reason = flags.reason?.trim() || "manual block";
      const score = flags.score ? Number.parseInt(flags.score, 10) : undefined;
      const source = flags.source?.trim() || "manual";
      const expiresAt = flags["expires-at"]
        ? new Date(flags["expires-at"])
        : null;
      const row = await blockIp({
        ip,
        reason,
        score: Number.isFinite(score) ? score : undefined,
        source,
        expiresAt,
      });
      console.log(`Blocked ${row.ip}: ${row.reason}`);
      return;
    }
    case "remove": {
      const ip = requireIp(flags);
      const removed = await unblockIp(ip);
      console.log(removed ? `Unblocked ${ip}` : `IP not in blocklist: ${ip}`);
      return;
    }
    case "purge-expired": {
      const count = await purgeExpiredBlockedIps();
      console.log(`Removed ${count} expired block(s).`);
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
