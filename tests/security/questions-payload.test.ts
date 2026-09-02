import { describe, expect, it } from "vitest";

import {
  decryptQuestionsPayload,
  encryptQuestionsPayload,
  exportQuestionsKey,
} from "@/lib/questions-payload";
import { issueTestToken } from "@/lib/test-access";

describe("questions-payload", () => {
  it("round-trips encrypted page payload", async () => {
    const testToken = await issueTestToken();
    const body = {
      page: 0,
      page_size: 5,
      total: 75,
      total_pages: 15,
      questions: [{ id: 1, left_text: "A", right_text: "B" }],
    };

    const encrypted = encryptQuestionsPayload(testToken, body);
    expect(encrypted.v).toBe(1);
    expect(encrypted.payload).not.toContain("left_text");

    const decrypted = decryptQuestionsPayload(testToken, encrypted.payload);
    expect(decrypted).toEqual(body);
  });

  it("exports a base64 key for the browser", async () => {
    const testToken = await issueTestToken();
    const key = exportQuestionsKey(testToken);
    expect(key.length).toBeGreaterThan(20);
    expect(() => atob(key)).not.toThrow();
  });
});
