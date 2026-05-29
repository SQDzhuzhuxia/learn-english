import { describe, expect, it } from "vitest";
import { summarizeReviewLogs } from "@/lib/review/review-diagnostics";
import type { ReviewLogRecord } from "@/lib/review/types";

function createLog(overrides: Partial<ReviewLogRecord>): ReviewLogRecord {
  return {
    id: overrides.id ?? "log-1",
    cardId: overrides.cardId ?? "card-1",
    rating: overrides.rating ?? "good",
    reviewedAt: overrides.reviewedAt ?? "2026-05-29T10:00:00.000Z",
    nextDueAt: overrides.nextDueAt ?? "2026-06-02T10:00:00.000Z"
  };
}

describe("summarizeReviewLogs", () => {
  it("summarizes recent rating counts, success rate, and trend", () => {
    const summary = summarizeReviewLogs(
      [
        createLog({
          id: "again",
          rating: "again",
          reviewedAt: "2026-05-29T08:00:00.000Z"
        }),
        createLog({
          id: "hard",
          rating: "hard",
          reviewedAt: "2026-05-28T08:00:00.000Z"
        }),
        createLog({
          id: "good",
          rating: "good",
          reviewedAt: "2026-05-27T08:00:00.000Z"
        }),
        createLog({
          id: "easy",
          rating: "easy",
          reviewedAt: "2026-05-26T08:00:00.000Z"
        }),
        createLog({
          id: "old",
          rating: "easy",
          reviewedAt: "2026-05-10T08:00:00.000Z"
        })
      ],
      new Date("2026-05-29T12:00:00.000Z")
    );

    expect(summary.totalReviews).toBe(5);
    expect(summary.recentReviews).toBe(4);
    expect(summary.successRate).toBe(50);
    expect(summary.attentionCount).toBe(2);
    expect(summary.ratingCounts).toEqual({
      again: 1,
      hard: 1,
      good: 1,
      easy: 1
    });
    expect(summary.dailyTrend.map((day) => day.reviews)).toEqual([0, 0, 0, 1, 1, 1, 1]);
    expect(summary.lastReviewedAt).toBe("2026-05-29T08:00:00.000Z");
    expect(summary.message).toContain("忘了和困难比例偏高");
  });

  it("returns a neutral empty state when there are no recent logs", () => {
    const summary = summarizeReviewLogs([], new Date("2026-05-29T12:00:00.000Z"));

    expect(summary.recentReviews).toBe(0);
    expect(summary.successRate).toBe(0);
    expect(summary.attentionCount).toBe(0);
    expect(summary.dailyTrend).toHaveLength(7);
    expect(summary.message).toContain("最近还没有复习记录");
  });
});
