import { describe, expect, it } from "vitest";
import { createRoleplayFeedback } from "@/lib/speech/roleplay-feedback";

describe("createRoleplayFeedback", () => {
  it("scores a complete and polite roleplay reply highly", () => {
    const feedback = createRoleplayFeedback({
      reply: "I would like to make an appointment with a doctor, please.",
      expectedKeywords: ["appointment", "doctor"],
      suggestedReply: "I would like to make an appointment with a doctor."
    });

    expect(feedback.score).toBeGreaterThanOrEqual(82);
    expect(feedback.missingKeywords).toEqual([]);
    expect(feedback.naturalReply).toBe("I would like to make an appointment with a doctor, please.");
  });

  it("returns missing keywords and a supported natural reply", () => {
    const feedback = createRoleplayFeedback({
      reply: "I want doctor.",
      expectedKeywords: ["appointment", "doctor"],
      suggestedReply: "I would like to make an appointment with a doctor."
    });

    expect(feedback.score).toBeLessThan(82);
    expect(feedback.matchedKeywords).toEqual(["doctor"]);
    expect(feedback.missingKeywords).toEqual(["appointment"]);
    expect(feedback.naturalReply).toBe("I would like to make an appointment with a doctor.");
  });

  it("handles an empty reply with beginner-friendly suggestions", () => {
    const feedback = createRoleplayFeedback({
      reply: "",
      expectedKeywords: ["sore throat", "yesterday"],
      suggestedReply: "I have had a sore throat since yesterday."
    });

    expect(feedback.score).toBeLessThan(40);
    expect(feedback.suggestions[0]).toContain("完整短句");
  });
});
