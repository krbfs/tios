/**
 * Decrypt AES-256-GCM questions payload from GET /api/test/questions.
 * Key is issued once with /api/test/start (questions_key).
 */
export async function decryptQuestionsPayload(payloadBase64, keyBase64) {
  const packed = Uint8Array.from(atob(payloadBase64), (char) => char.charCodeAt(0));
  if (packed.length < 12 + 16) {
    throw new Error("Invalid questions payload");
  }

  const iv = packed.subarray(0, 12);
  const ciphertextWithTag = packed.subarray(12);
  const keyRaw = Uint8Array.from(atob(keyBase64), (char) => char.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    "AES-GCM",
    false,
    ["decrypt"],
  );

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    ciphertextWithTag,
  );

  return JSON.parse(new TextDecoder().decode(plain));
}
