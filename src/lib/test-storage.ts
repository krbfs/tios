export type AnswerValue = -2 | -1 | 0 | 1 | 2;

const STORAGE_KEY = "tc26_answers";

export function loadAnswers(): Record<number, AnswerValue> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, AnswerValue>;
  } catch {
    return {};
  }
}

export function saveAnswers(answers: Record<number, AnswerValue>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

export function clearAnswers() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
