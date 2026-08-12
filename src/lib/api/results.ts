import type { ContentBlock, TestResult, TestSession } from "@prisma/client";

import { db } from "@/lib/db";

type ResultWithSession = TestResult & { session: TestSession };

export type ContentBlockDto = {
  block_key: string;
  block_template: string;
  title: string | null;
  content_text: string;
  sort_order: number;
  is_visible: boolean;
};

export function parseVisibilityOverrides(
  value: unknown,
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
}

export async function loadVisibleContentBlocks(
  psychotypeCode: string,
  mode: string,
  visibilityOverrides: Record<string, boolean>,
): Promise<ContentBlockDto[]> {
  const blocks = await db.contentBlock.findMany({
    where: {
      psychotypeCode,
      mode,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { blockKey: "asc" }],
  });

  const latestByKey = new Map<string, ContentBlock>();
  for (const block of blocks) {
    const existing = latestByKey.get(block.blockKey);
    if (!existing || block.version > existing.version) {
      latestByKey.set(block.blockKey, block);
    }
  }

  return [...latestByKey.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.blockKey.localeCompare(b.blockKey))
    .map((block) => {
      const isVisible = visibilityOverrides[block.blockKey] ?? block.isVisibleDefault;
      return {
        block_key: block.blockKey,
        block_template: block.blockTemplate,
        title: block.title,
        content_text: block.contentText,
        sort_order: block.sortOrder,
        is_visible: isVisible,
      };
    })
    .filter((block) => block.is_visible);
}

export function buildShareUrl(shareToken: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/results.html?token=${shareToken}`;
}

export async function serializeResult(
  result: ResultWithSession,
  options?: { includeHiddenBlocks?: boolean },
) {
  const visibilityOverrides = parseVisibilityOverrides(result.visibilityOverrides);
  const blocks = await loadVisibleContentBlocks(
    result.psychotypeCode,
    result.mode,
    options?.includeHiddenBlocks
      ? Object.fromEntries(
          (await db.contentBlock.findMany({
            where: {
              psychotypeCode: result.psychotypeCode,
              mode: result.mode,
              isActive: true,
            },
            select: { blockKey: true },
          })).map((block) => [block.blockKey, true]),
        )
      : visibilityOverrides,
  );

  return {
    id: result.id,
    session_uuid: result.session.sessionUuid,
    created_at: result.createdAt.toISOString(),
    answers: result.answers,
    scaled_scores: result.scaledScores,
    scaled_systemic: result.scaledSystemic,
    psychotype_code: result.psychotypeCode,
    psychotype_secondary: result.psychotypeSecondary,
    avg_intensity: result.avgIntensity,
    validation_warnings: result.validationWarnings,
    mode: result.mode,
    admin_comment:
      result.showAdminComment && result.adminComment ? result.adminComment : null,
    visibility_overrides: visibilityOverrides,
    is_public: result.isPublic,
    share_link: result.shareToken ? buildShareUrl(result.shareToken) : null,
    content_blocks: blocks,
  };
}

export async function getResultWithSession(
  id: string,
): Promise<ResultWithSession | null> {
  return db.testResult.findUnique({
    where: { id },
    include: { session: true },
  });
}

export async function canAccessResult(
  result: ResultWithSession,
  user: { id: string; role: string } | null,
  sessionUuid: string | null,
): Promise<boolean> {
  if (user?.role === "admin") {
    return true;
  }
  if (user && result.session.userId === user.id) {
    return true;
  }
  if (sessionUuid && result.session.sessionUuid === sessionUuid) {
    return true;
  }
  return false;
}
