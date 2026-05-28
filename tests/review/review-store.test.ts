import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveLearningItem,
  deleteLearningItem,
  isCardDue,
  loadLearningItems,
  loadReviewCards,
  restoreLearningItem,
  saveExpressionAsReviewCard,
  saveSegmentAsReviewCard,
  updateLearningItem
} from "@/lib/review/review-store";
import { getSeedMaterials } from "@/lib/content/material-store";
import type { ReviewCardRecord } from "@/lib/review/types";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  setupLocalStorage();
});

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

describe("learning item management", () => {
  it("updates a learning item and its review card", () => {
    loadLearningItems();
    loadReviewCards();

    updateLearningItem("seed-item-appointment", {
      type: "phrase",
      text: "book an appointment",
      meaningZh: "预约一个时间",
      meaningEn: "arrange a time for a service",
      contextText: "I need to book an appointment."
    });

    const item = loadLearningItems().find((record) => record.id === "seed-item-appointment");
    const card = loadReviewCards().find((record) => record.learningItemId === "seed-item-appointment");

    expect(item?.text).toBe("book an appointment");
    expect(item?.meaningZh).toBe("预约一个时间");
    expect(card?.front).toBe("book an appointment");
    expect(card?.back).toBe("预约一个时间");
    expect(card?.example).toBe("I need to book an appointment.");
  });

  it("archives and restores a learning item with its review card", () => {
    loadLearningItems();
    loadReviewCards();

    archiveLearningItem("seed-item-sore-throat");

    const archivedItem = loadLearningItems().find((record) => record.id === "seed-item-sore-throat");
    const suspendedCard = loadReviewCards().find(
      (record) => record.learningItemId === "seed-item-sore-throat"
    );

    expect(archivedItem?.status).toBe("archived");
    expect(suspendedCard?.status).toBe("suspended");

    restoreLearningItem("seed-item-sore-throat");

    const restoredItem = loadLearningItems().find((record) => record.id === "seed-item-sore-throat");
    const restoredCard = loadReviewCards().find(
      (record) => record.learningItemId === "seed-item-sore-throat"
    );

    expect(restoredItem?.status).toBe("active");
    expect(restoredCard?.status).toBe("new");
  });

  it("deletes a learning item and its review card", () => {
    loadLearningItems();
    loadReviewCards();

    const result = deleteLearningItem("seed-item-spell-name");

    expect(result.deletedCards).toBe(1);
    expect(loadLearningItems().some((record) => record.id === "seed-item-spell-name")).toBe(false);
    expect(loadReviewCards().some((record) => record.learningItemId === "seed-item-spell-name")).toBe(false);
  });

  it("saves an expression as a review card without duplicates", () => {
    const material = getSeedMaterials()[0];
    const segment = material.segments[2];

    const first = saveExpressionAsReviewCard(material, segment, {
      text: "openings",
      meaningZh: "可预约的空档",
      example: segment.text
    });
    const second = saveExpressionAsReviewCard(material, segment, {
      text: "openings",
      meaningZh: "可预约的空档",
      example: segment.text
    });

    const savedItems = loadLearningItems().filter((item) => item.text === "openings");
    const savedCards = loadReviewCards().filter((card) => card.learningItemId === first.item?.id);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]?.type).toBe("word");
    expect(savedCards.map((card) => card.cardType).sort()).toEqual([
      "production",
      "recognition",
      "spelling"
    ]);
  });

  it("creates multiple practice card types for saved sentences", () => {
    const material = getSeedMaterials()[0];
    const segment = material.segments[2];

    const result = saveSegmentAsReviewCard(material, segment);
    const savedCards = loadReviewCards().filter((card) => card.learningItemId === result.item?.id);

    expect(result.created).toBe(true);
    expect(savedCards.map((card) => card.cardType).sort()).toEqual([
      "listening",
      "production",
      "recognition",
      "speaking"
    ]);
  });
});
