import { describe, expect, it } from "vitest";
import {
  createFallbackMaterialExplanation,
  createFallbackSegmentExplanation
} from "@/lib/ai/fallback-explanation";

describe("createFallbackSegmentExplanation", () => {
  it("creates a useful local explanation without an API key", () => {
    const explanation = createFallbackSegmentExplanation({
      materialTitle: "Doctor Visit",
      materialType: "美国生活",
      level: "A1+",
      sentence: "I would like to make an appointment with a doctor."
    });

    expect(explanation.source).toBe("fallback");
    expect(explanation.sentence).toBe("I would like to make an appointment with a doctor.");
    expect(explanation.meaningZh).toContain("Doctor Visit");
    expect(explanation.structure.length).toBeGreaterThanOrEqual(3);
    expect(explanation.keyExpressions.length).toBeGreaterThan(0);
    expect(explanation.commonMistake).toContain("中文母语者");
  });

  it("creates a batch material explanation without an API key", () => {
    const explanation = createFallbackMaterialExplanation({
      materialTitle: "Bank Account",
      materialType: "美国生活",
      level: "A1",
      segments: [
        {
          id: "s1",
          order: 1,
          text: "I need to open a bank account."
        },
        {
          id: "s2",
          order: 2,
          text: "What documents do I need?"
        }
      ]
    });

    expect(explanation.source).toBe("fallback");
    expect(explanation.segments).toHaveLength(2);
    expect(explanation.segments[0]?.segmentId).toBe("s1");
    expect(explanation.keyExpressions.length).toBeGreaterThan(0);
  });
});
