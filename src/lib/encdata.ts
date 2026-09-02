import { createHmac, timingSafeEqual } from "node:crypto";

import { fillTimings, fillAnswers, calculate_result } from "@/lib/calculations";

const QUESTION_COUNT = 75;
const PACKED_VERSION = 1;
const SIGNED_VERSION = 2;
const BITS_PER_ANSWER = 3;
const ANSWER_OFFSET = 2;
const MAC_BYTES = 16;

function packedByteLength(): number {
  return 1 + Math.ceil((QUESTION_COUNT * BITS_PER_ANSWER) / 8);
}

function encdataSecret(): Buffer {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return createHmac("sha256", value ?? "dev-secret-change-me")
    .update("tios-encdata-v2")
    .digest();
}

function signPacked(packed: Buffer): Buffer {
  return createHmac("sha256", encdataSecret())
    .update(packed)
    .digest()
    .subarray(0, MAC_BYTES);
}

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

function verifyAndUnpackSigned(buffer: Buffer): number[] {
  const packedLen = packedByteLength();
  if (buffer.length !== packedLen + MAC_BYTES) {
    throw new Error("Invalid encdata encoding");
  }

  const packed = Buffer.alloc(packedLen);
  packed[0] = PACKED_VERSION;
  buffer.copy(packed, 1, 1, packedLen);

  const mac = buffer.subarray(packedLen);
  const expected = signPacked(packed);
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) {
    throw new Error("Invalid encdata signature");
  }

  return assertAnswers(unpackAnswersBinary(packed));
}

/**
 * Compact signed base64: 75 answers (−2…+2) + HMAC.
 * Public result links must use this format (oracle-resistant).
 */
export function encodeAnswers(answers: readonly number[]): string {
  assertAnswers([...answers]);
  const packed = packAnswersBinary(answers);
  const mac = signPacked(packed);
  const signed = Buffer.alloc(packedByteLength() + MAC_BYTES);
  signed[0] = SIGNED_VERSION;
  packed.copy(signed, 1, 1);
  mac.copy(signed, packedByteLength());
  return signed.toString("base64");
}

/** Unsigned v1 packing — only for tests / migration probes (rejected by by-encdata). */
export function encodeAnswersUnsignedForTests(answers: readonly number[]): string {
  assertAnswers([...answers]);
  return packAnswersBinary(answers).toString("base64");
}

export function decodeAnswers(encdata: string): number[] {
  const trimmed = encdata.trim();
  if (!trimmed) {
    throw new Error("encdata is empty");
  }

  const buffer = decodeBase64Buffer(trimmed);
  if (buffer.length > 0 && buffer[0] === SIGNED_VERSION) {
    return verifyAndUnpackSigned(buffer);
  }

  if (buffer.length > 0 && buffer[0] === PACKED_VERSION) {
    return assertAnswers(unpackAnswersBinary(buffer));
  }

  try {
    return assertAnswers(JSON.parse(buffer.toString("utf8")));
  } catch {
    throw new Error("Invalid encdata encoding");
  }
}

function answersEqual(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

/** True when encdata carries a valid HMAC (public scoring allowed). */
export function isSignedEncdata(encdata: string): boolean {
  try {
    const buffer = decodeBase64Buffer(encdata.trim());
    if (buffer[0] !== SIGNED_VERSION) {
      return false;
    }
    verifyAndUnpackSigned(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Public by-encdata gate: require HMAC, except the fixed public demo profile
 * (so marketing links and mobile tests work across local/prod JWT secrets).
 */
export function assertPublicEncdata(encdata: string): void {
  if (isSignedEncdata(encdata)) {
    return;
  }
  const decoded = tryDecodeForDemoAllowlist(encdata);
  if (decoded && matchesDemoAllowlist(decoded)) {
    return;
  }
  throw new Error("Invalid or unsigned result link");
}

/** Unpack answers even if v2 HMAC is wrong — only for demo allowlist checks. */
function tryDecodeForDemoAllowlist(encdata: string): number[] | null {
  try {
    const buffer = decodeBase64Buffer(encdata.trim());
    if (buffer[0] === SIGNED_VERSION) {
      const packedLen = packedByteLength();
      if (buffer.length !== packedLen + MAC_BYTES) {
        return null;
      }
      const packed = Buffer.alloc(packedLen);
      packed[0] = PACKED_VERSION;
      buffer.copy(packed, 1, 1, packedLen);
      return assertAnswers(unpackAnswersBinary(packed));
    }
    return decodeAnswers(encdata);
  } catch {
    return null;
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

/** Re-encode to current signed format when JWT_SECRET is available. */
export function canonicalizeEncdata(encdata: string): string {
  const answers = decodeAnswers(encdata);
  try {
    return encodeAnswers(answers);
  } catch (err) {
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
      return packAnswersBinary(answers).toString("base64");
    }
    throw err;
  }
}

/** Fixed threshold warnings on the public demo / «Пример результата». */
export const DEMO_THRESHOLD_WARNINGS = [
  "Вероятность достоверного прогноза — высокая",
  "Вероятны эмоциональные проявления",
  "Высокая вероятность непредсказуемого поведения",
] as const;

function matchesDemoAllowlist(answers: readonly number[]): boolean {
  return (
    answersEqual(answers, getDemoAnswers()) ||
    answersEqual(answers, getLegacyDemoAnswers())
  );
}

export function isDemoEncdata(encdata: string): boolean {
  try {
    if (matchesDemoAllowlist(decodeAnswers(encdata))) {
      return true;
    }
  } catch {
    // signed with foreign JWT still counts as demo if body matches
  }
  const decoded = tryDecodeForDemoAllowlist(encdata);
  return Boolean(decoded && matchesDemoAllowlist(decoded));
}

/** Pre–triad-tuning demo (prod link until sep 2026); kept on allowlist for old bookmarks. */
export function getLegacyDemoAnswers(): number[] {
  const answers = fillAnswers(0);
  const set = (ids: number[], value: number) => {
    for (const id of ids) {
      answers[id - 1] = value;
    }
  };

  set([1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56], -2);
  set([61, 66, 71], 1);
  set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], -1);
  set([65, 70, 75], -2);
  set([2, 7, 12, 17, 22, 27, 32, 37], -1);
  set([42, 47, 52, 57, 62, 67, 72], 1);
  set([3, 8, 13, 18, 23, 28, 33, 38], -1);
  set([43, 48, 53, 58, 63, 68, 73], 1);
  set([4, 9, 14], 0);
  answers[13] = 1;
  set([19, 24, 29], 1);
  answers[18] = 2;
  set([34, 39, 44], 0);
  set([49, 54], -1);
  answers[58] = 0;
  set([64, 69, 74], 1);

  return answers;
}

/**
 * Demo profile for landing / «Пример результата» — Лидер мнений + триада right (V1).
 * Answers tuned for separate-count math: filled radar + triad third ≥ 0.55.
 */
export function getDemoAnswers(): number[] {
  const answers = fillAnswers(0);
  const set = (ids: number[], value: number) => {
    for (const id of ids) {
      answers[id - 1] = value;
    }
  };

  // 8 шкал — насыщенный профиль (близко к старому образцу mock-result / prod demo)
  set([1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56], -2);
  set([61, 66, 71], 1);
  set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], -2);
  set([65, 70, 75], -2);
  set([2, 7, 12, 17, 22, 27, 32, 37, 42], -2);
  set([47, 52, 57, 62, 67, 72], 0);
  set([3, 8, 13, 18, 23, 28, 33, 38], -1);
  set([43, 48, 53, 58, 63, 68, 73], 1);

  // Блок 4 (системные свойства) — как в demo encdata до rework
  set([4, 9, 14], 0);
  answers[13] = 1;
  set([19, 24, 29], 1);
  answers[18] = 2;
  set([34, 39, 44], 0);
  set([49, 54], -1);
  answers[58] = 0;
  set([64, 69, 74], 1);

  return answers;
}

/**
 * Demo encdata for marketing pages / mobile smoke tests.
 * Always unsigned + fixed answers — accepted by by-encdata via demo allowlist,
 * independent of local vs Cloud Run JWT_SECRET.
 */
export function getDemoEncdata(): string {
  return packAnswersBinary(getDemoAnswers()).toString("base64");
}

export function computeFromEncdata(encdata: string) {
  let answers: number[];
  try {
    answers = decodeAnswers(encdata);
  } catch (err) {
    const decoded = tryDecodeForDemoAllowlist(encdata);
    if (!decoded || !matchesDemoAllowlist(decoded)) {
      throw err;
    }
    answers = decoded;
  }

  const computed = {
    answers,
    ...calculate_result(answers, fillTimings(5)),
  };

  if (isDemoEncdata(encdata)) {
    return { ...computed, warnings: [...DEMO_THRESHOLD_WARNINGS] };
  }

  return computed;
}
