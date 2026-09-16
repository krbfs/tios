/**
 * Каскадное определение профиля (source_sep_16th, математика v4.0).
 * 5 утверждённых триад (без «Остап Бендер» / individualist_ext — TBD).
 */

import {
  areScalesAdjacent,
  normalizeTendencyScore,
  psychotypeForPair,
  TRIAD_THIRD_NORMALIZED_MIN,
  type ProfileComplexity,
  type PsychotypeCode,
  type ScaleKey,
  type ScaledScores,
  type TriadVariant,
} from "@/lib/calculations";

const COMPLEX: PsychotypeCode = "complex";

type Ranked = { key: ScaleKey; score: number };

export type CascadeResolveResult = {
  psychotype_code: PsychotypeCode;
  secondary: PsychotypeCode | null;
  primary_type: PsychotypeCode;
  secondary_type: PsychotypeCode | null;
  profile_complexity: ProfileComplexity;
  cascade_level_used: number;
  cluster_tendencies: ScaleKey[];
  triad_variant: TriadVariant | null;
  pair: [ScaleKey, ScaleKey] | null;
};

/** Утверждённые триады (уровень 2); порядок тенденций в круге не важен. */
const APPROVED_SPECIAL_TRIADS: ReadonlyArray<{
  keys: readonly ScaleKey[];
  code: PsychotypeCode;
}> = [
  { keys: ["extraversion", "lability", "anxiety"], code: "influencer" },
  { keys: ["sensitivity", "introversion", "aggression"], code: "empath" },
  { keys: ["spontaneity", "extraversion", "rigidity"], code: "innovator" },
  { keys: ["introversion", "rigidity", "spontaneity"], code: "analyst" },
  { keys: ["anxiety", "sensitivity", "rigidity"], code: "conservative" },
];

const TENDENCY_CIRCLE: ScaleKey[] = [
  "aggression",
  "spontaneity",
  "extraversion",
  "lability",
  "anxiety",
  "sensitivity",
  "introversion",
  "rigidity",
];

function neighborCounterClockwise(key: ScaleKey): ScaleKey {
  const index = TENDENCY_CIRCLE.indexOf(key);
  const n = TENDENCY_CIRCLE.length;
  return TENDENCY_CIRCLE[(index - 1 + n) % n];
}

function neighborClockwise(key: ScaleKey): ScaleKey {
  const index = TENDENCY_CIRCLE.indexOf(key);
  return TENDENCY_CIRCLE[(index + 1) % TENDENCY_CIRCLE.length];
}

function orderPairClockwise(a: ScaleKey, b: ScaleKey): [ScaleKey, ScaleKey] {
  const indexA = TENDENCY_CIRCLE.indexOf(a);
  const indexB = TENDENCY_CIRCLE.indexOf(b);
  const n = TENDENCY_CIRCLE.length;
  if ((indexA + 1) % n === indexB) {
    return [a, b];
  }
  return [b, a];
}

function triadVariantForPurePair(
  pairA: ScaleKey,
  pairB: ScaleKey,
  third: ScaleKey,
): TriadVariant | null {
  if (!areScalesAdjacent(pairA, pairB)) {
    return null;
  }
  const [left, right] = orderPairClockwise(pairA, pairB);
  if (third === neighborCounterClockwise(left)) {
    return "left";
  }
  if (third === neighborClockwise(right)) {
    return "right";
  }
  return null;
}

function top3IsApprovedTriad(t1: ScaleKey, t2: ScaleKey, t3: ScaleKey): PsychotypeCode | null {
  const set = new Set([t1, t2, t3]);
  for (const triad of APPROVED_SPECIAL_TRIADS) {
    if (triad.keys.every((key) => set.has(key))) {
      return triad.code;
    }
  }
  return null;
}

type DyadHit = {
  keys: [ScaleKey, ScaleKey];
  code: PsychotypeCode;
  sum: number;
};

function validDyadsAmong(
  keys: ScaleKey[],
  scoreByKey: Record<ScaleKey, number>,
): DyadHit[] {
  const hits: DyadHit[] = [];
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = keys[i];
      const b = keys[j];
      if (!areScalesAdjacent(a, b)) {
        continue;
      }
      const code = psychotypeForPair(a, b);
      if (!code) {
        continue;
      }
      hits.push({ keys: [a, b], code, sum: scoreByKey[a] + scoreByKey[b] });
    }
  }
  return hits.sort((left, right) => right.sum - left.sum);
}

function pickDistinctDyads(dyads: DyadHit[]): { primary: DyadHit; secondary: DyadHit | null } {
  if (dyads.length === 0) {
    throw new Error("pickDistinctDyads: empty");
  }
  const primary = dyads[0];
  const secondary = dyads.find((item) => item.code !== primary.code) ?? null;
  return { primary, secondary };
}

function nearestNeighborInTop4(
  dominant: ScaleKey,
  top4: ScaleKey[],
  scoreByKey: Record<ScaleKey, number>,
): ScaleKey | null {
  const set = new Set(top4);
  const candidates = [neighborCounterClockwise(dominant), neighborClockwise(dominant)].filter(
    (key) => set.has(key) && key !== dominant,
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => scoreByKey[b] - scoreByKey[a])[0];
}

function buildSuccess(
  partial: Omit<CascadeResolveResult, never>,
): CascadeResolveResult {
  return partial;
}

function failComplex(cluster: ScaleKey[]): CascadeResolveResult {
  return {
    psychotype_code: COMPLEX,
    secondary: null,
    primary_type: COMPLEX,
    secondary_type: null,
    profile_complexity: "balanced",
    cascade_level_used: 0,
    cluster_tendencies: cluster,
    triad_variant: null,
    pair: null,
  };
}

/** true → complex (уровни 1–5 не дали валидной диады/триады). */
export function cascadeResultIsComplex(result: CascadeResolveResult): boolean {
  return result.cascade_level_used === 0 && result.psychotype_code === COMPLEX;
}

/**
 * Каскад уровней 1–5; complex только при полном провале.
 */
export function resolveProfileCascade(
  ranked: Ranked[],
  scaled_scores: ScaledScores,
  options: { allowTriadVariant: boolean; triadStatusImpossible: boolean },
): CascadeResolveResult {
  const top1 = ranked[0];
  const top2 = ranked[1];
  const top3 = ranked[2];
  if (!top1 || !top2 || !top3) {
    return failComplex([]);
  }

  const scoreByKey = Object.fromEntries(ranked.map((item) => [item.key, item.score])) as Record<
    ScaleKey,
    number
  >;
  const top4Keys = ranked.slice(0, 4).map((item) => item.key);
  const cluster_tendencies = top4Keys;

  // Уровень 1 — прямая диада
  if (areScalesAdjacent(top1.key, top2.key)) {
    const code = psychotypeForPair(top1.key, top2.key);
    if (code) {
      const pair: [ScaleKey, ScaleKey] = [top1.key, top2.key];
      let triad_variant: TriadVariant | null = null;
      if (
        options.allowTriadVariant &&
        !options.triadStatusImpossible &&
        top3.key !== pair[0] &&
        top3.key !== pair[1] &&
        normalizeTendencyScore(scaled_scores[top3.key]) >= TRIAD_THIRD_NORMALIZED_MIN
      ) {
        triad_variant = triadVariantForPurePair(pair[0], pair[1], top3.key);
      }
      return buildSuccess({
        psychotype_code: code,
        secondary: null,
        primary_type: code,
        secondary_type: null,
        profile_complexity: "pure",
        cascade_level_used: 1,
        cluster_tendencies,
        triad_variant,
        pair,
      });
    }
  }

  // Уровень 2 — утверждённая триада (top-3)
  const specialCode = top3IsApprovedTriad(top1.key, top2.key, top3.key);
  if (specialCode) {
    return buildSuccess({
      psychotype_code: specialCode,
      secondary: null,
      primary_type: specialCode,
      secondary_type: null,
      profile_complexity: "triad",
      cascade_level_used: 2,
      cluster_tendencies: [top1.key, top2.key, top3.key],
      triad_variant: "detected",
      pair: null,
    });
  }

  // Уровень 3 — кластер / двойной профиль (top-4)
  const dyadsTop4 = validDyadsAmong(top4Keys, scoreByKey);
  if (dyadsTop4.length >= 2) {
    const { primary, secondary } = pickDistinctDyads(dyadsTop4);
    const complexity: ProfileComplexity =
      dyadsTop4.length >= 3 ? "multidimensional" : "dual";
    return buildSuccess({
      psychotype_code: primary.code,
      secondary: secondary?.code ?? null,
      primary_type: primary.code,
      secondary_type: secondary?.code ?? null,
      profile_complexity: complexity,
      cascade_level_used: 3,
      cluster_tendencies,
      triad_variant: null,
      pair: primary.keys,
    });
  }

  // Уровень 4 — доминанта + модификатор
  if (top1.score - top2.score >= 4) {
    const neighbor = nearestNeighborInTop4(top1.key, top4Keys, scoreByKey);
    if (neighbor) {
      const code = psychotypeForPair(top1.key, neighbor);
      if (code) {
        const modifierDyads = validDyadsAmong(
          top4Keys.filter((key) => key === top2.key || areScalesAdjacent(top2.key, key)),
          scoreByKey,
        );
        const modifierCode =
          modifierDyads.find((item) => item.keys.includes(top2.key))?.code ?? null;
        return buildSuccess({
          psychotype_code: code,
          secondary: modifierCode,
          primary_type: code,
          secondary_type: modifierCode,
          profile_complexity: "modifier",
          cascade_level_used: 4,
          cluster_tendencies,
          triad_variant: null,
          pair: [top1.key, neighbor],
        });
      }
    }
  }

  // Уровень 5 — сбалансированный / fallback
  const top4 = ranked.slice(0, 4);
  const top4Score = top4[top4.length - 1]?.score ?? 0;
  const blurredPeaks =
    top1.score - top4Score <= 5 && top4.every((item) => item.score < 10);

  if (dyadsTop4.length >= 1) {
    const best = dyadsTop4[0];
    return buildSuccess({
      psychotype_code: best.code,
      secondary: dyadsTop4[1]?.code ?? null,
      primary_type: best.code,
      secondary_type: dyadsTop4[1]?.code ?? null,
      profile_complexity: "balanced",
      cascade_level_used: 5,
      cluster_tendencies,
      triad_variant: null,
      pair: best.keys,
    });
  }

  if (blurredPeaks) {
    return failComplex(cluster_tendencies);
  }

  return failComplex(cluster_tendencies);
}
