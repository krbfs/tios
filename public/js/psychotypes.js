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

export function formatPsychotypeTitle(code) {
  const meta = PSYCHOTYPE_META[code];
  if (!meta) {
    return code;
  }
  return `Вы — ${meta.name} (${meta.tendency1} + ${meta.tendency2})`;
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
