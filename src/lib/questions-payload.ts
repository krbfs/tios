import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

export const QUESTIONS_PAYLOAD_VERSION = 1;

function keyMaterial(): Buffer {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return createHmac("sha256", value ?? "dev-secret-change-me")
    .update("tios-questions-v1")
    .digest();
}

export function deriveQuestionsKey(testToken: string): Buffer {
  return createHmac("sha256", keyMaterial()).update(testToken).digest();
}

/** Base64 key for the browser (stored in sessionStorage after /api/test/start). */
export function exportQuestionsKey(testToken: string): string {
  return deriveQuestionsKey(testToken).toString("base64");
}

export type QuestionsPayloadBody = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  questions: Array<{
    id: number;
    left_text: string;
    right_text: string;
  }>;
};

export function encryptQuestionsPayload(
  testToken: string,
  body: QuestionsPayloadBody,
): { v: typeof QUESTIONS_PAYLOAD_VERSION; payload: string } {
  const key = deriveQuestionsKey(testToken);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(body), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, encrypted, tag]);
  return {
    v: QUESTIONS_PAYLOAD_VERSION,
    payload: packed.toString("base64"),
  };
}

/** Test helper and server-side validation. */
export function decryptQuestionsPayload(
  testToken: string,
  payloadBase64: string,
): QuestionsPayloadBody {
  const key = deriveQuestionsKey(testToken);
  const packed = Buffer.from(payloadBase64, "base64");
  if (packed.length < 12 + 16) {
    throw new Error("Invalid questions payload");
  }
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(packed.length - 16);
  const ciphertext = packed.subarray(12, packed.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as QuestionsPayloadBody;
}
