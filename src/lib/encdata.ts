import { fillTimings, fillAnswers, calculate_result } from "@/lib/calculations";

const QUESTION_COUNT = 75;
const PACKED_VERSION = 1;
const BITS_PER_ANSWER = 3;
const ANSWER_OFFSET = 2;

function decodeBase64Buffer(encdata: string): Buffer {
  const normalized = encdata.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function assertAnswers(answers: unknown): number[] {
  if (!Array.isArray(answers) || answers.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} answers in encdata`);
  }

  for (const value of answers) {
    if (!Number.isInteger(value) || value < -2 || value > 2) {
      throw new Error(`Invalid answer value in encdata: ${value}`);
    }
  }

  return answers;
}

function packAnswersBinary(answers: readonly number[]): Buffer {
  const normalized = answers.map((answer) => answer + ANSWER_OFFSET);
  const totalBits = QUESTION_COUNT * BITS_PER_ANSWER;
  const out = Buffer.alloc(1 + Math.ceil(totalBits / 8));
  out[0] = PACKED_VERSION;

  let bitIndex = 0;
  for (const value of normalized) {
    for (let bit = 0; bit < BITS_PER_ANSWER; bit += 1) {
      if (value & (1 << bit)) {
        const byteIndex = 1 + Math.floor(bitIndex / 8);
        const bitInByte = bitIndex % 8;
        out[byteIndex] |= 1 << bitInByte;
      }
      bitIndex += 1;
    }
  }

  return out;
}

function unpackAnswersBinary(buffer: Buffer): number[] {
  if (buffer[0] !== PACKED_VERSION) {
    throw new Error("Unknown packed encdata version");
  }

  const answers: number[] = [];
  let bitIndex = 0;

  for (let i = 0; i < QUESTION_COUNT; i += 1) {
    let value = 0;
    for (let bit = 0; bit < BITS_PER_ANSWER; bit += 1) {
      const byteIndex = 1 + Math.floor(bitIndex / 8);
      const bitInByte = bitIndex % 8;
      if (buffer[byteIndex] & (1 << bitInByte)) {
        value |= 1 << bit;
      }
      bitIndex += 1;
    }
    answers.push(value - ANSWER_OFFSET);
  }

  return answers;
}

/** Compact base64: 75 answers (−2…+2), 3 bits each (~40 chars). Legacy JSON arrays still decode. */
export function encodeAnswers(answers: readonly number[]): string {
  assertAnswers([...answers]);
  return packAnswersBinary(answers).toString("base64");
}

export function decodeAnswers(encdata: string): number[] {
  const trimmed = encdata.trim();
  if (!trimmed) {
    throw new Error("encdata is empty");
  }

  const buffer = decodeBase64Buffer(trimmed);
  if (buffer.length > 0 && buffer[0] === PACKED_VERSION) {
    return assertAnswers(unpackAnswersBinary(buffer));
  }

  try {
    return assertAnswers(JSON.parse(buffer.toString("utf8")));
  } catch {
    throw new Error("Invalid encdata encoding");
  }
}

const RESULT_PATH = "/quiz/result";

function siteBase(baseUrl?: string): string {
  return (baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Public result URL (canonical site domain from NEXT_PUBLIC_SITE_URL). */
export function buildResultUrl(encdata: string, baseUrl?: string): string {
  return `${siteBase(baseUrl)}${RESULT_PATH}?encdata=${encodeURIComponent(encdata)}`;
}

export function buildEncdataUrl(answers: readonly number[], baseUrl?: string): string {
  return buildResultUrl(encodeAnswers(answers), baseUrl);
}

/** Re-encode to current compact format (also accepts legacy JSON encdata). */
export function canonicalizeEncdata(encdata: string): string {
  return encodeAnswers(decodeAnswers(encdata));
}

/** Demo link for landing / «Пример результата» (Лидер мнений–like profile). */
export function getDemoAnswers(): number[] {
  const answers = fillAnswers(0);
  const set = (ids: number[], value: number) => {
    for (const id of ids) {
      answers[id - 1] = value;
    }
  };

  set([1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71], -2);
  set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75], -1);
  set([2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72], 1);

  // Блок 4 (системные свойства) — отдельно от 8 шкал Собчик
  set([4, 9, 14], 0);
  answers[13] = 1; // Q14 → raw 1, energy ≈ 17.5
  set([19, 24, 29], 1);
  answers[18] = 2; // Q19 → raw 4, result = 25
  set([34, 39, 44], 0); // quality = 15
  set([49, 54], -1);
  answers[58] = 0; // Q59 → raw -2, rules = 10
  set([64, 69, 74], 1); // delegation = 22.5

  return answers;
}

export function getDemoEncdata(): string {
  return encodeAnswers(getDemoAnswers());
}

export function computeFromEncdata(encdata: string) {
  const answers = decodeAnswers(encdata);
  return {
    answers,
    ...calculate_result(answers, fillTimings(5)),
  };
}
