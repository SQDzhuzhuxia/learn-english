import { describe, expect, it, vi } from "vitest";
import {
  resolvePronunciationScoringConfig,
  scorePronunciation
} from "@/lib/speech/server/pronunciation-score";

describe("resolvePronunciationScoringConfig", () => {
  it("uses fallback mode by default", () => {
    expect(resolvePronunciationScoringConfig({}).mode).toBe("fallback");
  });

  it("resolves a local pronunciation scoring endpoint", () => {
    const config = resolvePronunciationScoringConfig({
      PRONUNCIATION_PROVIDER: "local",
      PRONUNCIATION_BASE_URL: "http://127.0.0.1:8090",
      PRONUNCIATION_ENDPOINT_PATH: "/api/score"
    });

    expect(config.mode).toBe("local-multipart");

    if (config.mode === "local-multipart") {
      expect(config.endpointPath).toBe("/api/score");
      expect(config.referenceTextField).toBe("reference_text");
    }
  });
});

describe("scorePronunciation", () => {
  it("returns a fallback result when pronunciation scoring is not configured", async () => {
    const result = await scorePronunciation(
      {
        file: new File(["audio"], "test.webm", { type: "audio/webm" }),
        referenceText: "I would like to make an appointment."
      },
      {}
    );

    expect(result.source).toBe("fallback");
    expect(result.error).toContain("未配置");
  });

  it("calls a local pronunciation scoring endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 82,
          pronunciation_score: 78,
          fluency_score: 84,
          alignment_score: 88,
          feedback_zh: "th 和词尾辅音需要更清楚。",
          words: [{ word: "appointment", score: 76, issue: "word stress" }],
          phoneme_focus: [{ label: "th", detail: "舌尖音", words: ["with"] }]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    const result = await scorePronunciation(
      {
        file: new File(["audio"], "test.webm", { type: "audio/webm" }),
        referenceText: "I would like to make an appointment with a doctor.",
        transcript: "I would like appointment with doctor"
      },
      {
        PRONUNCIATION_PROVIDER: "local",
        PRONUNCIATION_BASE_URL: "http://127.0.0.1:8090",
        PRONUNCIATION_ENDPOINT_PATH: "/api/score"
      },
      fetchMock
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8090/api/score",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(result.source).toBe("local");
    expect(result.score).toBe(82);
    expect(result.wordScores[0]?.word).toBe("appointment");
    expect(result.phonemeFocus[0]?.label).toBe("th");
  });
});
