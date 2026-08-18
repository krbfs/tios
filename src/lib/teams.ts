import {
  computeLeaderScores,
  SCALE_KEYS,
  type ScaledScores,
} from "@/lib/calculations";
import { db } from "@/lib/db";

export const MAX_TEAM_RESULTS = 9;

export type TeamParticipant = {
  entry_id: string;
  result_id: string;
  label: string | null;
  psychotype_code: string;
  avg_intensity: number | null;
  scaled_scores: ScaledScores | null;
  leader_scores: ReturnType<typeof computeLeaderScores>;
};

export type CompatibilityCell = {
  type_a: string;
  type_b: string;
  compatibility_level: string;
  recommendation: string | null;
};

export async function userCanAccessTeam(
  teamId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  if (role === "admin") {
    return true;
  }

  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [{ createdById: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  return Boolean(team);
}

export async function loadTeamParticipants(teamId: string): Promise<TeamParticipant[]> {
  const entries = await db.teamResultEntry.findMany({
    where: { teamId },
    orderBy: { addedAt: "asc" },
    include: {
      result: {
        select: {
          id: true,
          psychotypeCode: true,
          avgIntensity: true,
          scaledScores: true,
        },
      },
    },
  });

  return entries.map((entry) => {
    const scaled =
      entry.result.scaledScores && typeof entry.result.scaledScores === "object"
        ? (entry.result.scaledScores as ScaledScores)
        : null;

    return {
      entry_id: entry.id,
      result_id: entry.result.id,
      label: entry.label,
      psychotype_code: entry.result.psychotypeCode,
      avg_intensity: entry.result.avgIntensity,
      scaled_scores: scaled,
      leader_scores: scaled ? computeLeaderScores(scaled) : [],
    };
  });
}

function normalizePair(typeA: string, typeB: string): [string, string] {
  return typeA <= typeB ? [typeA, typeB] : [typeB, typeA];
}

export async function buildCompatibilityMatrix(participants: TeamParticipant[]) {
  const rules = await db.compatibilityRule.findMany();
  const ruleByPair = new Map(
    rules.map((rule) => [`${rule.typeACode}:${rule.typeBCode}`, rule]),
  );

  const matrix: (CompatibilityCell | null)[][] = [];

  for (const row of participants) {
    const rowCells: (CompatibilityCell | null)[] = [];
    for (const col of participants) {
      if (row.result_id === col.result_id) {
        rowCells.push(null);
        continue;
      }

      const [typeA, typeB] = normalizePair(
        row.psychotype_code,
        col.psychotype_code,
      );
      const rule = ruleByPair.get(`${typeA}:${typeB}`);

      rowCells.push(
        rule
          ? {
              type_a: row.psychotype_code,
              type_b: col.psychotype_code,
              compatibility_level: rule.compatibilityLevel,
              recommendation: rule.recommendation,
            }
          : {
              type_a: row.psychotype_code,
              type_b: col.psychotype_code,
              compatibility_level: "unknown",
              recommendation: null,
            },
      );
    }
    matrix.push(rowCells);
  }

  return matrix;
}

export function buildAverageTeamProfile(
  participants: TeamParticipant[],
): Partial<ScaledScores> | null {
  const withScores = participants.filter((item) => item.scaled_scores);
  if (withScores.length === 0) {
    return null;
  }

  const average: Partial<ScaledScores> = {};
  for (const key of SCALE_KEYS) {
    const sum = withScores.reduce(
      (total, item) => total + Number(item.scaled_scores?.[key] ?? 0),
      0,
    );
    average[key] = Math.round(sum / withScores.length);
  }

  return average;
}
