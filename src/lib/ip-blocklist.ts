import { logAntibotEvent } from "@/lib/antibot-log";
import { error } from "@/lib/api/http";
import { db } from "@/lib/db";

const CACHE_MS = 60_000;

type BlockCache = {
  ips: Set<string>;
  loadedAt: number;
};

let cache: BlockCache | null = null;

async function loadBlockedIps(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_MS) {
    return cache.ips;
  }

  const rows = await db.blockedIp.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { ip: true },
  });

  cache = {
    ips: new Set(rows.map((row) => row.ip)),
    loadedAt: now,
  };
  return cache.ips;
}

/** Test helper: drop in-memory cache after DB changes. */
export function invalidateBlockedIpCache() {
  cache = null;
}

export async function isBlockedIp(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") {
    return false;
  }
  const blocked = await loadBlockedIps();
  return blocked.has(ip);
}

export async function rejectIfBlockedIp(request: Request): Promise<Response | null> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  if (!(await isBlockedIp(ip))) {
    return null;
  }

  logAntibotEvent(request, {
    event: "ip_blocked",
    status: 403,
    reason: "IP is blocklisted",
    ip,
  });
  return error("Access denied", 403);
}

export type BlockIpInput = {
  ip: string;
  reason: string;
  score?: number;
  source?: string;
  expiresAt?: Date | null;
};

export async function blockIp(input: BlockIpInput) {
  const row = await db.blockedIp.upsert({
    where: { ip: input.ip },
    create: {
      ip: input.ip,
      reason: input.reason,
      score: input.score ?? null,
      source: input.source ?? "manual",
      expiresAt: input.expiresAt ?? null,
    },
    update: {
      reason: input.reason,
      score: input.score ?? null,
      source: input.source ?? "manual",
      expiresAt: input.expiresAt ?? null,
      blockedAt: new Date(),
    },
  });
  invalidateBlockedIpCache();
  return row;
}

export async function unblockIp(ip: string): Promise<boolean> {
  const result = await db.blockedIp.deleteMany({ where: { ip } });
  invalidateBlockedIpCache();
  return result.count > 0;
}

export async function listBlockedIps() {
  return db.blockedIp.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { blockedAt: "desc" },
  });
}

/** Remove expired rows (optional housekeeping). */
export async function purgeExpiredBlockedIps(): Promise<number> {
  const result = await db.blockedIp.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  invalidateBlockedIpCache();
  return result.count;
}
