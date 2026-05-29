import { describe, expect, it } from "vitest";
import { getReviewCardDetail } from "@/lib/review/review-card-detail";
import type { LearningItemRecord, ReviewCardRecord, ReviewLogRecord } from "@/lib/review/types";

function createItem(overrides: Partial<LearningItemRecord> = {}): LearningItemRecord {
  return {
    id: overrides.id ?? "item-1",
    type: overrides.type ?? "phrase",
    status: overrides.status ?? "active",
    text: overrides.text ?? "make an appointment",
    meaningZh: overrides.meaningZh ?? "预约",
    sourceMaterialId: overrides.sourceMaterialId ?? "doctor-visit",
    sourceMaterialTitle: overrides.sourceMaterialTitle ?? "A Visit to the Doctor",
    sourceSegmentId: overrides.sourceSegmentId ?? "s1",
    contextText: overrides.contextText ?? "I would like to make an appointment.",
    createdAt: overrides.createdAt ?? "2026-05-28T00:00:00.000Z",
    updatedAt: overrides.updatedAt
  };
}

function createCard(overrides: Partial<ReviewCardRecord> = {}): ReviewCardRecord {
  return {
    id: overrides.id ?? "card-1",
    learningItemId: overrides.learningItemId ?? "item-1",
    cardType: overrides.cardType ?? "recognition",
    front: overrides.front ?? "make an appointment",
    back: overrides.back ?? "预约",
    example: overrides.example ?? "I would like to make an appointment.",
    source: overrides.source ?? "A Visit to the Doctor",
    dueAt: overrides.dueAt ?? "2026-05-29T00:00:00.000Z",
    intervalDays: overrides.intervalDays ?? 0,
    ease: overrides.ease ?? 2.5,
    status: overrides.status ?? "review",
    createdAt: overrides.createdAt ?? "2026-05-28T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-29T00:00:00.000Z"
  };
}

function createLog(overrides: Partial<ReviewLogRecord>): ReviewLogRecord {
  return {
    id: overrides.id ?? "log-1",
    cardId: overrides.cardId ?? "card-1",
    rating: overrides.rating ?? "good",
    reviewedAt: overrides.reviewedAt ?? "2026-05-29T00:00:00.000Z",
    nextDueAt: overrides.nextDueAt ?? "2026-06-02T00:00:00.000Z"
  };
}

describe("getReviewCardDetail", () => {
  it("joins a review card with its learning item and latest log", () => {
    const detail = getReviewCardDetail(
      createCard(),
      [createItem()],
      [
        createLog({
          id: "old",
          rating: "good",
          reviewedAt: "2026-05-28T00:00:00.000Z"
        }),
        createLog({
          id: "latest",
          rating: "hard",
          reviewedAt: "2026-05-29T00:00:00.000Z"
        })
      ]
    );

    expect(detail.item?.text).toBe("make an appointment");
    expect(detail.reviewCount).toBe(2);
    expect(detail.recentLogs.map((log) => log.id)).toEqual(["latest", "old"]);
    expect(detail.latestRating).toBe("hard");
    expect(detail.latestReviewedAt).toBe("2026-05-29T00:00:00.000Z");
    expect(detail.needsAttention).toBe(true);
    expect(detail.statusLabel).toBe("复习中");
    expect(detail.sourceStudyHref).toBe("/study/doctor-visit");
    expect(detail.suggestion).toContain("原句");
  });

  it("handles cards without matching items or logs", () => {
    const detail = getReviewCardDetail(createCard({ status: "new" }), [], []);

    expect(detail.item).toBeUndefined();
    expect(detail.reviewCount).toBe(0);
    expect(detail.recentLogs).toEqual([]);
    expect(detail.latestRating).toBeUndefined();
    expect(detail.needsAttention).toBe(false);
    expect(detail.statusLabel).toBe("新卡");
    expect(detail.sourceStudyHref).toBeUndefined();
    expect(detail.suggestion).toContain("短频快");
  });

  it("does not link writing-only items back to study materials", () => {
    const detail = getReviewCardDetail(
      createCard(),
      [createItem({ sourceMaterialId: "writing-self-introduction" })],
      []
    );

    expect(detail.sourceStudyHref).toBeUndefined();
  });

  it("keeps only the three newest review logs in detail history", () => {
    const detail = getReviewCardDetail(
      createCard(),
      [createItem()],
      [
        createLog({ id: "1", reviewedAt: "2026-05-26T00:00:00.000Z" }),
        createLog({ id: "2", reviewedAt: "2026-05-27T00:00:00.000Z" }),
        createLog({ id: "3", reviewedAt: "2026-05-28T00:00:00.000Z" }),
        createLog({ id: "4", reviewedAt: "2026-05-29T00:00:00.000Z" })
      ]
    );

    expect(detail.reviewCount).toBe(4);
    expect(detail.recentLogs.map((log) => log.id)).toEqual(["4", "3", "2"]);
  });
});
