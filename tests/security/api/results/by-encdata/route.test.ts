import { beforeEach, describe, expect, it, vi } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  encodeAnswers,
  encodeAnswersUnsignedForTests,
  getDemoAnswers,
  getDemoEncdata,
} from "@/lib/encdata";
import { resetTestAccessStateForTests } from "@/lib/test-access";
import { apiRequest, readJson } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  loadVisibleContentBlocks: vi.fn(),
}));

vi.mock("@/lib/api/results", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/results")>();
  return {
    ...actual,
    loadVisibleContentBlocks: mocks.loadVisibleContentBlocks,
  };
});

import { GET } from "@/app/api/results/by-encdata/route";

describe("GET /api/results/by-encdata", () => {
  beforeEach(() => {
    resetTestAccessStateForTests();
    mocks.loadVisibleContentBlocks.mockReset();
    mocks.loadVisibleContentBlocks.mockResolvedValue([
      {
        block_key: "intro",
        block_template: "plain",
        title: "Intro",
        content_text: "Hello",
        sort_order: 0,
        is_visible: true,
      },
    ]);
  });

  it("returns 400 when encdata is missing", async () => {
    const response = await GET(apiRequest("/api/results/by-encdata"));
    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: "encdata query parameter is required",
    });
  });

  it("returns 400 for invalid encdata", async () => {
    const response = await GET(
      apiRequest("/api/results/by-encdata?encdata=not-valid"),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({ error: expect.any(String) });
  });

  it("rejects unsigned encdata (oracle probe)", async () => {
    const unsigned = encodeAnswersUnsignedForTests(fillAnswers(0));
    const response = await GET(
      apiRequest(`/api/results/by-encdata?encdata=${encodeURIComponent(unsigned)}`),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: expect.stringMatching(/unsigned|Invalid/i),
    });
  });

  it("accepts unsigned encdata for the fixed demo profile", async () => {
    const encdata = encodeAnswersUnsignedForTests(getDemoAnswers());
    const response = await GET(
      apiRequest(`/api/results/by-encdata?encdata=${encodeURIComponent(encdata)}`),
    );
    expect(response.status).toBe(200);
    const payload = await readJson<{ is_demo: boolean; psychotype_code: string }>(response);
    expect(payload.is_demo).toBe(true);
    expect(payload.psychotype_code).toBe("influencer");
  });

  it("returns computed result payload for valid encdata", async () => {
    const encdata = encodeAnswers(fillAnswers(0));
    const response = await GET(
      apiRequest(`/api/results/by-encdata?encdata=${encodeURIComponent(encdata)}`),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{
      encdata: string;
      psychotype_code: string;
      result_url: string;
      content_blocks: Array<{ block_key: string }>;
      admin_comment: null;
      answers?: unknown;
      scaled_scores: Record<string, number>;
    }>(response);

    expect(payload.encdata).toBe(encdata);
    expect(payload.psychotype_code).toBeTruthy();
    expect(payload.result_url).toContain("/quiz/result?encdata=");
    expect(payload.admin_comment).toBeNull();
    expect(payload.content_blocks).toHaveLength(1);
    expect(payload.answers).toBeUndefined();
    expect(payload.scaled_scores).toBeTruthy();
    expect(mocks.loadVisibleContentBlocks).toHaveBeenCalledWith(
      payload.psychotype_code,
      "leader_resource",
      {},
      null,
      null,
      expect.objectContaining({
        profileComplexity: expect.anything(),
      }),
    );
  });

  it("returns computed demo profile with influencer psychotype", async () => {
    const encdata = getDemoEncdata();
    const response = await GET(
      apiRequest(`/api/results/by-encdata?encdata=${encodeURIComponent(encdata)}`),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{
      warnings: string[];
      psychotype_code: string;
      is_demo: boolean;
      created_at?: string;
    }>(response);
    expect(payload.psychotype_code).toBe("influencer");
    expect(payload.is_demo).toBe(true);
    expect(payload.created_at).toBeUndefined();
    expect(payload.compensatory_check).toMatchObject({
      psychotype_code: "influencer",
      outcome: "risk",
      peak_scale: "extraversion",
    });
    expect(payload.warnings.length).toBeGreaterThan(0);
    expect(
      payload.warnings.some((w) => w.includes("Вероятность достоверного прогноза")),
    ).toBe(true);
  });
});
