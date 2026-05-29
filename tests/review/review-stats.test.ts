import { describe, expect, it } from "vitest";
import { getReviewQueueStats } from "@/lib/review/review-stats";
import type { ReviewCardRecord } from "@/lib/review/types";

function createCard(overrides: Partial<ReviewCardRecord>): ReviewCardRecord {
  return {
    id: overrides.id ?? "card-1",
    learningItemId: overrides.learningItemId ?? "item-1",
    cardType: overrides.cardType ?? "recognition",
    front: overrides.front ?? "front",
    back: overrides.back ?? "back",
    example: overrides.example ?? "example",
    source: overrides.source ?? "source",
    dueAt: overrides.dueAt ?? "2026-05-28T00:00:00.000Z",
    intervalDays: overrides.intervalDays ?? 0,
    ease: overrides.ease ?? 2.5,
    status: overrides.status ?? "new",
    createdAt: overrides.createdAt ?? "2026-05-28T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-28T00:00:00.000Z"
  };
}

describe("getReviewQueueStats", () => {
  it("summarizes active, due, new, future, suspended, and card types", () => {
    const stats = getReviewQueueStats(
      [
        createCard({
          id: "card-due-new",
          cardType: "recognition",
          status: "new",
          dueAt: "2026-05-28T00:00:00.000Z"
        }),
        createCard({
          id: "card-due-review",
          cardType: "production",
          status: "review",
          dueAt: "2026-05-28T00:00:00.000Z"
        }),
        createCard({
          id: "card-future",
          cardType: "listening",
          status: "learning",
          dueAt: "2026-05-30T00:00:00.000Z"
        }),
        createCard({
          id: "card-suspended",
          cardType: "spelling",
          status: "suspended",
          dueAt: "2026-05-28T00:00:00.000Z"
        })
      ],
      new Date("2026-05-29T00:00:00.000Z")
    );

    expect(stats).toEqual({
      total: 3,
      due: 2,
      new: 1,
      suspended: 1,
      future: 1,
      byType: {
        recognition: 1,
        listening: 1,
        spelling: 0,
        speaking: 0,
        production: 1
      }
    });
  });

  it("returns independent card type buckets for each call", () => {
    const first = getReviewQueueStats([createCard({ cardType: "speaking" })]);
    const second = getReviewQueueStats([]);

    expect(first.byType.speaking).toBe(1);
    expect(second.byType.speaking).toBe(0);
  });
});
