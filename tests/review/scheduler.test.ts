import { describe, expect, it } from "vitest";
import { getNextReviewDate, getReviewIntervalDays } from "@/lib/review/scheduler";

describe("review scheduler", () => {
  const reviewedAt = new Date("2026-05-27T00:00:00.000Z");

  it("uses a same-day follow-up for forgotten cards", () => {
    expect(getNextReviewDate("again", reviewedAt).toISOString()).toBe(
      "2026-05-27T06:00:00.000Z"
    );
  });

  it("uses simple initial intervals for hard, good, and easy ratings", () => {
    expect(getReviewIntervalDays("hard")).toBe(1);
    expect(getReviewIntervalDays("good")).toBe(4);
    expect(getReviewIntervalDays("easy")).toBe(7);
  });
});
