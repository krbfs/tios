export const SCALE_LABELS = {
  extraversion: "Экстраверсия",
  introversion: "Интроверсия",
  anxiety: "Тревожность",
  aggression: "Агрессивность",
  sensitivity: "Сензитивность",
  spontaneity: "Спонтанность",
  lability: "Лабильность",
  rigidity: "Ригидность",
};

export const SYSTEMIC_LABELS = {
  sys_energy: "Энергия",
  sys_result: "Результат",
  sys_quality: "Качество",
  sys_rules: "Правила",
  sys_delegation: "Делегирование",
};

/** Bar colors matched to each systemic property meaning. */
export const SYSTEMIC_COLORS = {
  sys_energy: { from: "#fb923c", to: "#f97316", value: "#ea580c" },
  sys_result: { from: "#4ade80", to: "#22c55e", value: "#15803d" },
  sys_quality: { from: "#a78bfa", to: "#8b5cf6", value: "#6d28d9" },
  sys_rules: { from: "#64748b", to: "#475569", value: "#334155" },
  sys_delegation: { from: "#22d3ee", to: "#06b6d4", value: "#0e7490" },
};

/** Radar vertex order clockwise from top (12 o'clock) in Chart.js 4. */
export const RADAR_SCALE_ORDER = [
  "anxiety",
  "lability",
  "extraversion",
  "spontaneity",
  "aggression",
  "rigidity",
  "introversion",
  "sensitivity",
];

/** Table order next to the radar chart (raw 0–30). */
export const SCALE_TABLE_ORDER = [
  "anxiety",
  "lability",
  "extraversion",
  "spontaneity",
  "aggression",
  "rigidity",
  "introversion",
  "sensitivity",
];

/** Raw scale 0–30; show .5 when the block formula yields it (see work.md §3). */
export function formatScaleValue(rawValue) {
  const value = Number(rawValue ?? 0);
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

const SCALE_KEYS = [
  "extraversion",
  "introversion",
  "anxiety",
  "aggression",
  "sensitivity",
  "spontaneity",
  "lability",
  "rigidity",
];

/** Средняя выраженность: сумма 8 шкал ÷ 8. */
export function calculateAvgIntensity(scores) {
  return (
    SCALE_KEYS.reduce((sum, key) => sum + Number(scores[key] ?? 0), 0) /
    SCALE_KEYS.length
  );
}

export const PSYCHOTYPE_META = {
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

export function formatPsychotypeSummary(code) {
  const meta = PSYCHOTYPE_META[code];
  if (!meta) {
    return code;
  }
  return `${meta.name.toLowerCase()} (${meta.tendency1} + ${meta.tendency2})`;
}

export function formatPsychotypeTitle(code) {
  return `Основной психотип: ${formatPsychotypeSummary(code)}`;
}

export function interpretScaleValue(value) {
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

export const SLIDER_LABELS = {
  "-2": "полностью согласен с А",
  "-1": "скорее согласен с А",
  0: "нейтрален",
  1: "скорее согласен с В",
  2: "полностью согласен с В",
};
