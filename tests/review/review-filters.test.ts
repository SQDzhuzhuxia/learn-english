import { describe, expect, it } from "vitest";
import { filterReviewCards } from "@/lib/review/review-filters";
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

describe("filterReviewCards", () => {
  const referenceDate = new Date("2026-05-29T00:00:00.000Z");
  const cards = [
    createCard({
      id: "due-recognition",
      cardType: "recognition",
      status: "review",
      dueAt: "2026-05-28T00:00:00.000Z"
    }),
    createCard({
      id: "new-production",
      cardType: "production",
      status: "new",
      dueAt: "2026-05-28T00:00:00.000Z"
    }),
    createCard({
      id: "future-listening",
      cardType: "listening",
      status: "learning",
      dueAt: "2026-05-30T00:00:00.000Z"
    }),
    createCard({
      id: "suspended-speaking",
      cardType: "speaking",
      status: "suspended",
      dueAt: "2026-05-28T00:00:00.000Z"
    })
  ];

  it("excludes suspended cards from every queue", () => {
    expect(
      filterReviewCards(cards, { queue: "all", cardType: "all", referenceDate }).map(
        (card) => card.id
      )
    ).toEqual(["due-recognition", "new-production", "future-listening"]);
  });

  it("filters due, new, and future cards", () => {
    expect(
      filterReviewCards(cards, { queue: "due", cardType: "all", referenceDate }).map(
        (card) => card.id
      )
    ).toEqual(["due-recognition", "new-production"]);
    expect(
      filterReviewCards(cards, { queue: "new", cardType: "all", referenceDate }).map(
        (card) => card.id
      )
    ).toEqual(["new-production"]);
    expect(
      filterReviewCards(cards, { queue: "future", cardType: "all", referenceDate }).map(
        (card) => card.id
      )
    ).toEqual(["future-listening"]);
  });

  it("combines queue and card type filters", () => {
    expect(
      filterReviewCards(cards, { queue: "due", cardType: "production", referenceDate }).map(
        (card) => card.id
      )
    ).toEqual(["new-production"]);
    expect(
      filterReviewCards(cards, { queue: "due", cardType: "listening", referenceDate })
    ).toHaveLength(0);
  });
});
