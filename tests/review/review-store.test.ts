import { describe, expect, it } from "vitest";
import { isCardDue } from "@/lib/review/review-store";
import type { ReviewCardRecord } from "@/lib/review/types";

describe("isCardDue", () => {
  const baseCard: ReviewCardRecord = {
    id: "card-1",
    learningItemId: "item-1",
    cardType: "recognition",
    front: "hello",
    back: "你好",
    example: "hello",
    source: "test",
    dueAt: "2026-05-28T00:00:00.000Z",
    intervalDays: 0,
    ease: 2.5,
    status: "new",
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z"
  };

  it("detects due cards", () => {
    expect(isCardDue(baseCard, new Date("2026-05-28T01:00:00.000Z"))).toBe(true);
  });

  it("detects future cards", () => {
    expect(isCardDue(baseCard, new Date("2026-05-27T23:00:00.000Z"))).toBe(false);
  });
});
