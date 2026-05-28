import { describe, expect, it } from "vitest";
import { createShadowingFeedback } from "@/lib/speech/shadowing-feedback";

describe("createShadowingFeedback", () => {
  it("scores a close shadowing transcript", () => {
    const feedback = createShadowingFeedback(
      "I would like to make an appointment with a doctor.",
      "I would like to make an appointment with a doctor"
    );

    expect(feedback.score).toBe(100);
    expect(feedback.label).toBe("很接近");
    expect(feedback.missingWords).toHaveLength(0);
  });

  it("shows missing words for an incomplete transcript", () => {
    const feedback = createShadowingFeedback(
      "I would like to make an appointment with a doctor.",
      "I want appointment doctor"
    );

    expect(feedback.score).toBeLessThan(60);
    expect(feedback.missingWords).toContain("would");
  });
});
