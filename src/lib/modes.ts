/** Content display modes (NAVIGATOR / TZ v4.0). */
export const ALLOWED_MODES = [
  "leader_resource",
  "insighter",
  "insighter_you",
  "stressless",
  "hr_table",
] as const;

export type ResultMode = (typeof ALLOWED_MODES)[number];

export const INSIGHTER_PAIR: ResultMode[] = ["insighter", "insighter_you"];

export const MODE_LABELS: Record<ResultMode, string> = {
  leader_resource: "Ресурс руководителя",
  insighter: "Инсайтер",
  insighter_you: "Инсайтер (ты)",
  stressless: "Стресслесс",
  hr_table: "Таблица для HR",
};

export function isAllowedMode(value: string): value is ResultMode {
  return (ALLOWED_MODES as readonly string[]).includes(value);
}

export function isInsighterPairMode(mode: string): mode is (typeof INSIGHTER_PAIR)[number] {
  return INSIGHTER_PAIR.includes(mode as ResultMode);
}

export function isManualInsighterPairSwitch(from: string, to: string): boolean {
  return (
    isInsighterPairMode(from) &&
    isInsighterPairMode(to) &&
    from !== to
  );
}

export type ViewerContext = {
  user: { id: string; role: string } | null;
  sessionUuid: string | null;
};

/**
 * Effective content mode for loading blocks (REWORK_PLAN §3.1).
 * - Admin → insighter (3rd person)
 * - Result owner (user or session) → insighter_you (2nd person)
 * - Anonymous → stored result.mode (default leader_resource)
 */
export function resolveContentMode(
  storedMode: string,
  sessionUserId: string | null,
  viewer: ViewerContext,
): ResultMode {
  if (viewer.user?.role === "admin") {
    return "insighter";
  }

  if (viewer.user && sessionUserId && viewer.user.id === sessionUserId) {
    return "insighter_you";
  }

  if (
    viewer.sessionUuid &&
    sessionUserId === null &&
    viewer.sessionUuid
  ) {
    // Session-only owner before login — resolved in API via session match
  }

  if (isAllowedMode(storedMode)) {
    return storedMode;
  }

  return "leader_resource";
}

export function resolveContentModeForSession(
  storedMode: string,
  sessionUserId: string | null,
  sessionUuid: string,
  viewer: ViewerContext,
): ResultMode {
  if (viewer.user?.role === "admin") {
    return "insighter";
  }

  if (viewer.user && sessionUserId && viewer.user.id === sessionUserId) {
    return "insighter_you";
  }

  if (viewer.sessionUuid && viewer.sessionUuid === sessionUuid) {
    return "insighter_you";
  }

  if (isAllowedMode(storedMode)) {
    return storedMode;
  }

  return "leader_resource";
}
