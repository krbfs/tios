import type { PsychotypeCode } from "@/lib/calculations";

export const CONSENT_VERSION = 1;

export const CONSENT_TEXT =
  "Я даю согласие на обработку моих персональных данных, включая результаты тестирования, в целях предоставления мне персонализированных рекомендаций. Я понимаю, что результаты не являются медицинским диагнозом. Я могу отозвать согласие и удалить свои данные в любой момент в личном кабинете.";

export const SCALE_LABELS: Record<string, string> = {
  extraversion: "Экстраверсия",
  introversion: "Интроверсия",
  anxiety: "Тревожность",
  aggression: "Агрессивность",
  sensitivity: "Сензитивность",
  spontaneity: "Спонтанность",
  lability: "Лабильность",
  rigidity: "Ригидность",
};

export const SYSTEMIC_LABELS: Record<string, string> = {
  sys_energy: "Энергия",
  sys_result: "Результат",
  sys_quality: "Качество",
  sys_rules: "Правила",
  sys_delegation: "Делегирование",
};

export const SYSTEMIC_COLORS: Record<
  string,
  { from: string; to: string; value: string }
> = {
  sys_energy: { from: "#fb923c", to: "#f97316", value: "#ea580c" },
  sys_result: { from: "#4ade80", to: "#22c55e", value: "#15803d" },
  sys_quality: { from: "#a78bfa", to: "#8b5cf6", value: "#6d28d9" },
  sys_rules: { from: "#64748b", to: "#475569", value: "#334155" },
  sys_delegation: { from: "#22d3ee", to: "#06b6d4", value: "#0e7490" },
};

/** Radar vertex order clockwise from top (12 o'clock). */
export const RADAR_SCALE_ORDER = [
  "anxiety",
  "lability",
  "extraversion",
  "spontaneity",
  "aggression",
  "rigidity",
  "introversion",
  "sensitivity",
] as const;

type PsychotypeMeta = {
  name: string;
  tendency1: string;
  tendency2: string;
};

export const PSYCHOTYPE_META: Record<PsychotypeCode, PsychotypeMeta> = {
  individualist: {
    name: "Индивидуалист",
    tendency1: "Агрессивность",
    tendency2: "Спонтанность",
  },
  innovator: {
    name: "Инноватор",
    tendency1: "Спонтанность",
    tendency2: "Экстраверсия",
  },
  influencer: {
    name: "Лидер мнений",
    tendency1: "Экстраверсия",
    tendency2: "Лабильность",
  },
  aesthete: {
    name: "Эстет",
    tendency1: "Лабильность",
    tendency2: "Тревожность",
  },
  conservative: {
    name: "Консерватор",
    tendency1: "Тревожность",
    tendency2: "Сензитивность",
  },
  empath: {
    name: "Эмпат",
    tendency1: "Сензитивность",
    tendency2: "Интроверсия",
  },
  analyst: {
    name: "Аналитик",
    tendency1: "Интроверсия",
    tendency2: "Ригидность",
  },
  pragmatist: {
    name: "Прагматик",
    tendency1: "Ригидность",
    tendency2: "Агрессивность",
  },
};

export function formatPsychotypeSummary(code: string): string {
  const meta = PSYCHOTYPE_META[code as PsychotypeCode];
  if (!meta) {
    return code;
  }
  return `${meta.name.toLowerCase()} (${meta.tendency1} + ${meta.tendency2})`;
}

export function formatPsychotypeTitle(code: string): string {
  return `Основной психотип: ${formatPsychotypeSummary(code)}`;
}

export function interpretScaleValue(value: number): string {
  if (value <= 6) {
    return "низкий уровень";
  }
  if (value <= 12) {
    return "умеренный уровень";
  }
  if (value <= 22) {
    return "повышенный уровень";
  }
  return "высокий уровень";
}
