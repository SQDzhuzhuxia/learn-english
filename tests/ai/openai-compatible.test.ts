import { afterEach, describe, expect, it, vi } from "vitest";
import {
  explainSegmentWithOpenAiCompatible,
  parseSegmentExplanationResponse
} from "@/lib/ai/openai-compatible";
import type { ExplainSegmentInput } from "@/lib/ai/types";

const input: ExplainSegmentInput = {
  materialTitle: "Apartment Tour",
  materialType: "租房",
  level: "A1",
  sentence: "Is the apartment available next month?",
  contextText: "I am looking for an apartment near my office."
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseSegmentExplanationResponse", () => {
  it("normalizes provider JSON into an app explanation", () => {
    const explanation = parseSegmentExplanationResponse(
      JSON.stringify({
        sentence: input.sentence,
        meaningZh: "询问公寓下个月是否可租。",
        structure: ["Is ... available：是否可用", "next month：下个月"],
        keyExpressions: [
          {
            text: "available",
            meaningZh: "可用的，可租的",
            example: input.sentence
          }
        ],
        commonMistake: "不要说 can use apartment。",
        shadowingTip: "available 前后稍微停顿。"
      }),
      input,
      "Test Provider"
    );

    expect(explanation.source).toBe("model");
    expect(explanation.provider).toBe("Test Provider");
    expect(explanation.keyExpressions[0]?.text).toBe("available");
  });
});

describe("explainSegmentWithOpenAiCompatible", () => {
  it("calls a chat-completions compatible endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sentence: input.sentence,
                  meaningZh: "询问公寓下个月是否可租。",
                  structure: ["Is ... available：是否可用"],
                  keyExpressions: [
                    {
                      text: "available",
                      meaningZh: "可用的，可租的",
                      example: input.sentence
                    }
                  ],
                  commonMistake: "不要逐词翻译。",
                  shadowingTip: "先慢速读完整句。"
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const explanation = await explainSegmentWithOpenAiCompatible(input, {
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Local Test",
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key"
        })
      })
    );
    expect(explanation.meaningZh).toContain("公寓");
  });
});
