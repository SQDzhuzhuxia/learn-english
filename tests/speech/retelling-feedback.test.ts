import { describe, expect, it } from "vitest";
import { createRetellingFeedback } from "@/lib/speech/retelling-feedback";

const keyPoints = [
  { label: "想预约医生", keywords: ["appointment", "doctor"] },
  { label: "从昨天开始嗓子疼", keywords: ["throat", "yesterday"] },
  { label: "询问今天下午是否有空档", keywords: ["openings", "afternoon"] }
];

describe("createRetellingFeedback", () => {
  it("scores a retelling that covers the key points", () => {
    const feedback = createRetellingFeedback({
      transcript:
        "I want to make an appointment with a doctor because I have a sore throat since yesterday. I ask if there are openings this afternoon.",
      keyPoints,
      usefulWords: ["appointment", "doctor", "throat", "openings", "afternoon"]
    });

    expect(feedback.score).toBeGreaterThanOrEqual(85);
    expect(feedback.coveredPoints).toHaveLength(3);
    expect(feedback.missingPoints).toHaveLength(0);
  });

  it("suggests missing points for a short retelling", () => {
    const feedback = createRetellingFeedback({
      transcript: "I need a doctor.",
      keyPoints,
      usefulWords: ["appointment", "doctor", "throat", "openings", "afternoon"]
    });

    expect(feedback.score).toBeLessThan(60);
    expect(feedback.missingPoints).toContain("从昨天开始嗓子疼");
    expect(feedback.suggestions.length).toBeGreaterThan(0);
  });
});
