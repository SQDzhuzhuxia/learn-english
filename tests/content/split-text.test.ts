import { describe, expect, it } from "vitest";
import { estimateReadingMinutes, splitTextIntoSegments } from "@/lib/content/split-text";

describe("splitTextIntoSegments", () => {
  it("splits English text by sentence boundaries", () => {
    const result = splitTextIntoSegments("Hello. I need help! Can you call me?");

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      order: 1,
      text: "Hello.",
      familiarity: "重点"
    });
    expect(result[2]?.text).toBe("Can you call me?");
  });

  it("returns an empty list for blank input", () => {
    expect(splitTextIntoSegments("  \n  ")).toEqual([]);
  });
});

describe("estimateReadingMinutes", () => {
  it("never estimates less than three minutes", () => {
    expect(estimateReadingMinutes("short text")).toBe(3);
  });
});
