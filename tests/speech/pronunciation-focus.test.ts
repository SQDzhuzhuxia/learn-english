import { describe, expect, it } from "vitest";
import { createPronunciationFocus } from "@/lib/speech/pronunciation-focus";

describe("createPronunciationFocus", () => {
  it("detects common pronunciation focus areas for Chinese-native learners", () => {
    const focus = createPronunciationFocus(["throat", "would", "appointment", "please"]);
    const ids = focus.map((item) => item.id);

    expect(ids).toContain("th");
    expect(ids).toContain("v-w");
    expect(ids).toContain("final-consonant");
    expect(ids).toContain("cluster");
    expect(ids).toContain("long-word");
  });

  it("limits words for each focus area", () => {
    const focus = createPronunciationFocus(["with", "three", "throat", "thank", "thirty"]);
    const thFocus = focus.find((item) => item.id === "th");

    expect(thFocus?.words).toHaveLength(4);
    expect(thFocus?.sound).toBe("/θ/ /ð/");
  });
});
