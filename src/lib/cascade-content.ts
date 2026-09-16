import type { ProfileComplexity } from "@/lib/calculations";
import { primaryTypeLabel } from "@/lib/psychotypes";

export const SPECIAL_TRIAD_BLOCK_KEYS = new Set([
  "triad_influencer_anx",
  "triad_conservative_rig",
  "triad_individualist_ext",
  "triad_empath_agg",
  "triad_innovator_rig",
  "triad_analyst_spo",
]);

export const CASCADE_PROFILE_MESSAGE_KEYS = new Set([
  "dual_profile_message",
  "multidimensional_profile_message",
  "modifier_profile_message",
  "balanced_profile_message",
]);

const PROFILE_MESSAGE_BY_COMPLEXITY: Partial<
  Record<ProfileComplexity, string>
> = {
  dual: "dual_profile_message",
  multidimensional: "multidimensional_profile_message",
  modifier: "modifier_profile_message",
  balanced: "balanced_profile_message",
};

export type CascadeContentContext = {
  profileComplexity?: string | null;
  primaryTypeCode?: string | null;
  secondaryTypeCode?: string | null;
  triadVariant?: string | null;
};

export function resolveContentPsychotypeCode(
  psychotypeCode: string,
  context: CascadeContentContext,
): string {
  const complexity = context.profileComplexity;
  if (
    complexity === "dual" ||
    complexity === "multidimensional" ||
    complexity === "modifier"
  ) {
    return context.primaryTypeCode ?? psychotypeCode;
  }
  return psychotypeCode;
}

export function cascadeProfileMessageBlockKey(
  profileComplexity: string | null | undefined,
): string | null {
  if (!profileComplexity) {
    return null;
  }
  return (
    PROFILE_MESSAGE_BY_COMPLEXITY[profileComplexity as ProfileComplexity] ??
    null
  );
}

export function substituteCascadePlaceholders(
  text: string,
  context: CascadeContentContext,
): string {
  const primary =
    primaryTypeLabel(context.primaryTypeCode ?? "") ||
    "[Основной тип]";
  const secondary =
    primaryTypeLabel(context.secondaryTypeCode ?? "") ||
    "[Сопутствующий тип]";
  return text
    .replaceAll("[Основной тип]", primary)
    .replaceAll("[Сопутствующий тип]", secondary)
    .replaceAll("[модификатор]", secondary);
}

export function applyCascadeContentPresentationRules<
  T extends { block_key: string; content_text?: string },
>(blocks: T[], context: CascadeContentContext): T[] {
  let next = blocks;

  if (context.triadVariant === "detected") {
    next = next.filter(
      (block) =>
        block.block_key !== "description_main" &&
        block.block_key !== "triad_addition_left" &&
        block.block_key !== "triad_addition_right",
    );
  }

  if (context.profileComplexity && context.profileComplexity !== "pure") {
    const messageKey = cascadeProfileMessageBlockKey(context.profileComplexity);
    if (messageKey) {
      next = next.filter((block) => {
        if (!CASCADE_PROFILE_MESSAGE_KEYS.has(block.block_key)) {
          return true;
        }
        return block.block_key === messageKey;
      });
    }
  }

  return next.map((block) => {
    if (!CASCADE_PROFILE_MESSAGE_KEYS.has(block.block_key)) {
      return block;
    }
    if (!block.content_text) {
      return block;
    }
    return {
      ...block,
      content_text: substituteCascadePlaceholders(block.content_text, context),
    };
  });
}
