import { db } from "@/lib/db";

const PSYCHOTYPES = [
  "individualist",
  "innovator",
  "influencer",
  "aesthete",
  "conservative",
  "empath",
  "analyst",
  "pragmatist",
] as const;

export type CompatibilityRuleDto = {
  type_a: string;
  type_b: string;
  compatibility_level: string;
  complement_zone: string | null;
  common_zone: string | null;
  intensity_note: string | null;
  recommendation: string | null;
};

function normalizePair(typeA: string, typeB: string): [string, string] {
  return typeA <= typeB ? [typeA, typeB] : [typeB, typeA];
}

export async function getCompatibilityRule(
  typeA: string,
  typeB: string,
): Promise<CompatibilityRuleDto | null> {
  const [a, b] = normalizePair(typeA, typeB);
  const rule = await db.compatibilityRule.findFirst({
    where: { typeACode: a, typeBCode: b },
  });

  if (!rule) {
    return null;
  }

  return {
    type_a: a,
    type_b: b,
    compatibility_level: rule.compatibilityLevel,
    complement_zone: rule.complementZone,
    common_zone: rule.commonZone,
    intensity_note: rule.intensityNote,
    recommendation: rule.recommendation,
  };
}

export async function getCompatibilityMatrix(): Promise<CompatibilityRuleDto[][]> {
  const rules = await db.compatibilityRule.findMany();
  const byPair = new Map(
    rules.map((rule) => [`${rule.typeACode}:${rule.typeBCode}`, rule]),
  );

  const matrix: CompatibilityRuleDto[][] = [];

  for (const rowType of PSYCHOTYPES) {
    const row: CompatibilityRuleDto[] = [];
    for (const colType of PSYCHOTYPES) {
      if (rowType === colType) {
        row.push({
          type_a: rowType,
          type_b: colType,
          compatibility_level: "self",
          complement_zone: null,
          common_zone: null,
          intensity_note: null,
          recommendation: null,
        });
        continue;
      }

      const [a, b] = normalizePair(rowType, colType);
      const rule = byPair.get(`${a}:${b}`);

      row.push(
        rule
          ? {
              type_a: a,
              type_b: b,
              compatibility_level: rule.compatibilityLevel,
              complement_zone: rule.complementZone,
              common_zone: rule.commonZone,
              intensity_note: rule.intensityNote,
              recommendation: rule.recommendation,
            }
          : {
              type_a: a,
              type_b: b,
              compatibility_level: "unknown",
              complement_zone: null,
              common_zone: null,
              intensity_note: null,
              recommendation: null,
            },
      );
    }
    matrix.push(row);
  }

  return matrix;
}

export { PSYCHOTYPES as COMPATIBILITY_PSYCHOTYPES };
