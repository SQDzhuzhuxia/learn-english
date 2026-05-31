import { describe, expect, it } from "vitest";
import { createShadowingFeedback } from "@/lib/speech/shadowing-feedback";

describe("createShadowingFeedback", () => {
  it("scores a close shadowing transcript", () => {
    const feedback = createShadowingFeedback(
      "I would like to make an appointment with a doctor.",
      "I would like to make an appointment with a doctor"
    );

    expect(feedback.score).toBe(100);
    expect(feedback.completeness).toBe(100);
    expect(feedback.label).toBe("很接近");
    expect(feedback.missingWords).toHaveLength(0);
    expect(feedback.extraWords).toHaveLength(0);
  });

  it("shows missing words for an incomplete transcript", () => {
    const feedback = createShadowingFeedback(
      "I would like to make an appointment with a doctor.",
      "I want appointment doctor"
    );

    expect(feedback.score).toBeLessThan(60);
    expect(feedback.missingWords).toContain("would");
    expect(feedback.extraWords).toContain("want");
    expect(feedback.focusWords).toContain("would");
    expect(feedback.pronunciationFocus.map((item) => item.id)).toContain("v-w");
    expect(feedback.suggestions.length).toBeGreaterThan(0);
  });

  it("penalizes extra recognized words while preserving completeness", () => {
    const feedback = createShadowingFeedback(
      "I would like to make an appointment.",
      "I would really like to make a appointment today"
    );

    expect(feedback.completeness).toBeGreaterThanOrEqual(70);
    expect(feedback.score).toBeLessThan(feedback.completeness);
    expect(feedback.extraWords).toEqual(expect.arrayContaining(["really", "a", "today"]));
  });
});
