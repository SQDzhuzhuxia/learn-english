import { describe, expect, it } from "vitest";
import { createFallbackSegmentExplanation } from "@/lib/ai/fallback-explanation";

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
});
