import type { ContentBlock, TestResult, TestSession } from "@prisma/client";

import {
  buildCoachingRecommendations,
  buildSortedPersonalScales,
  computeLeaderScores,
  determine_empath_subtype,
  determine_psychotype,
  empathSubtypeBlockKey,
  EMPATH_SUBTYPE_BLOCK_KEYS,
  EMPATH_SUBTYPE_LABELS,
  type ScaledScores,
  type SystemicScores,
} from "@/lib/calculations";
import { db } from "@/lib/db";
import { encodeAnswers, buildResultUrl } from "@/lib/encdata";
import { resolveContentModeForSession, MODE_LABELS, type ResultMode } from "@/lib/modes";

export { ALLOWED_MODES, type ResultMode } from "@/lib/modes";

type ResultWithSession = TestResult & { session: TestSession };

export type ContentBlockDto = {
  block_key: string;
  block_template: string;
  title: string | null;
  content_text: string;
  sort_order: number;
  is_visible: boolean;
  triad_variant: string | null;
};

export const COMPLEX_PROFILE_BLOCK_KEY = "complex_profile_message";
export const TRIAD_ADDITION_LEFT_KEY = "triad_addition_left";
export const TRIAD_ADDITION_RIGHT_KEY = "triad_addition_right";
export const EMPATH_SUBTYPE_BLOCK_KEY_SET = new Set(
  Object.values(EMPATH_SUBTYPE_BLOCK_KEYS),
);

/**
 * NAVIGATOR §5.1 display rules for V1 content.
 * complex → only complex_profile_message; otherwise keep loaded set (base ± triad).
 */
export function applyV1ContentDisplayRules<
  T extends { block_key: string },
>(psychotypeCode: string, blocks: T[]): T[] {
  if (psychotypeCode === "complex") {
    return blocks.filter((block) => block.block_key === COMPLEX_PROFILE_BLOCK_KEY);
  }
  return blocks;
}


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

function latestBlocksByKey(blocks: ContentBlock[]): ContentBlock[] {
  const latestByKey = new Map<string, ContentBlock>();
  for (const block of blocks) {
    const mapKey = `${block.blockKey}::${block.triadVariant ?? ""}`;
    const existing = latestByKey.get(mapKey);
    if (!existing || block.version > existing.version) {
      latestByKey.set(mapKey, block);
    }
  }

  return [...latestByKey.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.blockKey.localeCompare(b.blockKey),
  );
}

function mapContentBlockDto(
  block: ContentBlock,
  visibilityOverrides: Record<string, boolean>,
): ContentBlockDto {
  const isVisible = visibilityOverrides[block.blockKey] ?? block.isVisibleDefault;
  return {
    block_key: block.blockKey,
    block_template: block.blockTemplate,
    title: block.title,
    content_text: block.contentText,
    sort_order: block.sortOrder,
    is_visible: isVisible,
    triad_variant: block.triadVariant,
  };
}

export type LoadContentOptions = {
  includeHidden?: boolean;
  /** When set to left/right, include matching triad blocks plus base (NULL). Otherwise only base. */
  triadVariant?: string | null;
  empathSubtypeBlockKey?: string | null;
};

function filterEmpathSubtypeBlocks<
  T extends { block_key: string },
>(blocks: T[], empathSubtypeBlockKey: string | null | undefined): T[] {
  return blocks.filter((block) => {
    if (!EMPATH_SUBTYPE_BLOCK_KEY_SET.has(block.block_key)) {
      return true;
    }
    return (
      typeof empathSubtypeBlockKey === "string" &&
      block.block_key === empathSubtypeBlockKey
    );
  });
}

export async function loadContentBlocks(
  psychotypeCode: string,
  mode: ResultMode,
  visibilityOverrides: Record<string, boolean>,
  options?: LoadContentOptions,
): Promise<ContentBlockDto[]> {
  const triadVariant =
    options?.triadVariant === "left" || options?.triadVariant === "right"
      ? options.triadVariant
      : null;

  const where =
    psychotypeCode === "complex"
      ? {
          psychotypeCode,
          mode,
          isActive: true,
          blockKey: COMPLEX_PROFILE_BLOCK_KEY,
        }
      : {
          psychotypeCode,
          mode,
          isActive: true,
          OR: triadVariant
            ? [{ triadVariant: null }, { triadVariant }]
            : [{ triadVariant: null }],
        };

  const blocks = await db.contentBlock.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { blockKey: "asc" }],
  });

  const mapped = applyV1ContentDisplayRules(
    psychotypeCode,
    filterEmpathSubtypeBlocks(
      latestBlocksByKey(blocks).map((block) =>
        mapContentBlockDto(block, visibilityOverrides),
      ),
      psychotypeCode === "empath" ? options?.empathSubtypeBlockKey : null,
    ),
  );

  if (options?.includeHidden) {
    return mapped;
  }

  return mapped.filter((block) => block.is_visible);
}

export async function loadVisibleContentBlocks(
  psychotypeCode: string,
  mode: ResultMode,
  visibilityOverrides: Record<string, boolean>,
  triadVariant?: string | null,
  empathSubtypeBlockKey?: string | null,
): Promise<ContentBlockDto[]> {
  return loadContentBlocks(psychotypeCode, mode, visibilityOverrides, {
    triadVariant,
    empathSubtypeBlockKey,
  });
}

export function getEncdataFromAnswers(answers: unknown): string | null {
  if (!Array.isArray(answers) || answers.length !== 75) {
    return null;
  }
  try {
    return encodeAnswers(answers as number[]);
  } catch {
    return null;
  }
}

export function buildShareUrl(encdata: string): string {
  return buildResultUrl(encdata);
}

export type SerializeViewer = {
  user: { id: string; role: string } | null;
  sessionUuid: string | null;
};

function thresholdWarningsFromResult(result: TestResult): string[] {
  if (!result.scaledScores || typeof result.scaledScores !== "object") {
    return [];
  }

  const systemic =
    result.scaledSystemic && typeof result.scaledSystemic === "object"
      ? (result.scaledSystemic as Pick<
          SystemicScores,
          "tension_zone" | "correspondence_type"
        >)
      : undefined;

  return determine_psychotype(
    result.scaledScores as ScaledScores,
    systemic,
  ).warnings;
}

export function viewerOwnsResult(
  result: ResultWithSession,
  viewer: SerializeViewer,
): boolean {
  if (viewer.user && result.session.userId === viewer.user.id) {
    return true;
  }
  if (viewer.sessionUuid && result.session.sessionUuid === viewer.sessionUuid) {
    return true;
  }
  return false;
}

async function loadModeRequestNotice(resultId: string) {
  const notice = await db.modeRequest.findFirst({
    where: {
      resultId,
      status: { in: ["approved", "rejected"] },
    },
    orderBy: { resolvedAt: "desc" },
  });

  if (!notice) {
    return null;
  }

  const mode = notice.requestedMode as ResultMode;

  return {
    id: notice.id,
    status: notice.status,
    requested_mode: notice.requestedMode,
    requested_mode_label: MODE_LABELS[mode] ?? notice.requestedMode,
    admin_note: notice.adminNote,
    resolved_at: notice.resolvedAt?.toISOString() ?? null,
  };
}

export async function serializeResult(
  result: ResultWithSession,
  viewer: SerializeViewer = { user: null, sessionUuid: null },
) {
  const visibilityOverrides = parseVisibilityOverrides(result.visibilityOverrides);
  const contentMode = resolveContentModeForSession(
    result.mode,
    result.session.userId,
    result.session.sessionUuid,
    viewer,
  );
  const empathSubtype =
    result.psychotypeCode === "empath" &&
    typeof result.subIndexS === "number" &&
    typeof result.subIndexN === "number"
      ? determine_empath_subtype(result.subIndexS, result.subIndexN)
      : null;
  const blocks = await loadVisibleContentBlocks(
    result.psychotypeCode,
    contentMode,
    visibilityOverrides,
    result.triadVariant,
    empathSubtypeBlockKey(empathSubtype),
  );

  const encdata = getEncdataFromAnswers(result.answers);
  const scaledScores = result.scaledScores as ScaledScores;
  const scaledSystemic = result.scaledSystemic as SystemicScores | null;
  const modeRequestNotice = viewerOwnsResult(result, viewer)
    ? await loadModeRequestNotice(result.id)
    : null;

  return {
    id: result.id,
    encdata,
    result_url: encdata ? buildShareUrl(encdata) : null,
    session_uuid: result.session.sessionUuid,
    created_at: result.createdAt.toISOString(),
    answers: result.answers,
    scaled_scores: result.scaledScores,
    scaled_systemic: result.scaledSystemic,
    sorted_personal_scales: buildSortedPersonalScales(scaledScores),
    leader_scores: computeLeaderScores(scaledScores),
    coaching_recommendations: scaledSystemic
      ? buildCoachingRecommendations(scaledSystemic)
      : [],
    psychotype_code: result.psychotypeCode,
    psychotype_secondary: result.psychotypeSecondary,
    triad_variant: result.triadVariant,
    sub_index_s: result.subIndexS,
    sub_index_n: result.subIndexN,
    empath_subtype: empathSubtype,
    empath_subtype_label: empathSubtype
      ? EMPATH_SUBTYPE_LABELS[empathSubtype]
      : null,
    avg_intensity: result.avgIntensity,
    validation_warnings: result.validationWarnings,
    warnings: thresholdWarningsFromResult(result),
    mode: result.mode,
    content_mode: contentMode,
    admin_comment:
      result.showAdminComment && result.adminComment ? result.adminComment : null,
    visibility_overrides: visibilityOverrides,
    is_public: result.isPublic,
    share_link: encdata ? buildShareUrl(encdata) : null,
    content_blocks: blocks,
    mode_request_notice: modeRequestNotice,
  };
}

export async function serializeAdminResult(result: ResultWithSession) {
  const visibilityOverrides = parseVisibilityOverrides(result.visibilityOverrides);
  const empathSubtype =
    result.psychotypeCode === "empath" &&
    typeof result.subIndexS === "number" &&
    typeof result.subIndexN === "number"
      ? determine_empath_subtype(result.subIndexS, result.subIndexN)
      : null;
  const blocks = await loadContentBlocks(
    result.psychotypeCode,
    "insighter",
    visibilityOverrides,
    {
      includeHidden: true,
      triadVariant: result.triadVariant,
      empathSubtypeBlockKey: empathSubtypeBlockKey(empathSubtype),
    },
  );

  return {
    ...(await serializeResult(result, {
      user: { id: "admin", role: "admin" },
      sessionUuid: null,
    })),
    mode: result.mode,
    admin_comment: result.adminComment,
    show_admin_comment: result.showAdminComment,
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
