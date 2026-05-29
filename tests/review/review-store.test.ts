import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveLearningItem,
  archiveLearningItems,
  deleteLearningItem,
  deleteLearningItems,
  isCardDue,
  loadLearningItems,
  loadReviewCards,
  loadReviewLogs,
  restoreLearningItem,
  restoreLearningItems,
  restoreReviewCard,
  restoreReviewCards,
  resetReviewCard,
  saveReviewCards,
  saveReviewLogs,
  saveExpressionAsReviewCard,
  saveSegmentAsReviewCard,
  saveWritingItemAsReviewCard,
  suspendReviewCard,
  suspendReviewCards,
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

  it("suspends and restores a single review card without archiving its learning item", () => {
    loadLearningItems();
    loadReviewCards();

    const suspendedCard = suspendReviewCard("seed-card-appointment");

    expect(suspendedCard?.status).toBe("suspended");
    expect(loadLearningItems().find((item) => item.id === "seed-item-appointment")?.status).toBe("active");
    expect(loadReviewCards().find((card) => card.id === "seed-card-appointment")?.status).toBe(
      "suspended"
    );

    const restoredCard = restoreReviewCard("seed-card-appointment");

    expect(restoredCard?.status).toBe("new");
    expect(loadReviewCards().find((card) => card.id === "seed-card-appointment")?.status).toBe("new");
  });

  it("suspends and restores review cards in bulk", () => {
    loadLearningItems();
    loadReviewCards();

    const suspendResult = suspendReviewCards([
      "seed-card-appointment",
      "seed-card-sore-throat",
      "missing-card"
    ]);

    expect(suspendResult).toEqual({
      suspendedCards: 2
    });
    expect(
      loadReviewCards()
        .filter((card) => ["seed-card-appointment", "seed-card-sore-throat"].includes(card.id))
        .every((card) => card.status === "suspended")
    ).toBe(true);

    const restoreResult = restoreReviewCards(["seed-card-appointment", "seed-card-sore-throat"]);

    expect(restoreResult).toEqual({
      restoredCards: 2
    });
    expect(
      loadReviewCards()
        .filter((card) => ["seed-card-appointment", "seed-card-sore-throat"].includes(card.id))
        .every((card) => card.status === "new")
    ).toBe(true);
  });

  it("resets a review card to new and clears its logs", () => {
    loadLearningItems();
    loadReviewCards();
    saveReviewLogs([
      {
        id: "log-1",
        cardId: "seed-card-appointment",
        rating: "hard",
        reviewedAt: "2026-05-29T00:00:00.000Z",
        nextDueAt: "2026-05-30T00:00:00.000Z"
      },
      {
        id: "log-2",
        cardId: "seed-card-sore-throat",
        rating: "good",
        reviewedAt: "2026-05-29T00:00:00.000Z",
        nextDueAt: "2026-06-02T00:00:00.000Z"
      }
    ]);
    const card = loadReviewCards().find((record) => record.id === "seed-card-appointment");

    if (!card) {
      throw new Error("Seed card missing");
    }

    saveReviewCards([
      {
        ...card,
        status: "review",
        intervalDays: 4,
        ease: 2.8,
        dueAt: "2026-06-02T00:00:00.000Z"
      },
      ...loadReviewCards().filter((record) => record.id !== "seed-card-appointment")
    ]);

    const result = resetReviewCard("seed-card-appointment");
    const resetCard = loadReviewCards().find((record) => record.id === "seed-card-appointment");

    expect(result.deletedLogs).toBe(1);
    expect(resetCard?.status).toBe("new");
    expect(resetCard?.intervalDays).toBe(0);
    expect(resetCard?.ease).toBe(2.5);
    expect(loadReviewLogs().map((log) => log.id)).toEqual(["log-2"]);
  });

  it("archives, restores, and deletes learning items in bulk", () => {
    loadLearningItems();
    loadReviewCards();

    const archiveResult = archiveLearningItems([
      "seed-item-appointment",
      "seed-item-sore-throat",
      "missing-item"
    ]);

    expect(archiveResult).toEqual({
      archivedItems: 2,
      suspendedCards: 2
    });
    expect(
      loadLearningItems()
        .filter((item) => ["seed-item-appointment", "seed-item-sore-throat"].includes(item.id))
        .every((item) => item.status === "archived")
    ).toBe(true);
    expect(
      loadReviewCards()
        .filter((card) => ["seed-item-appointment", "seed-item-sore-throat"].includes(card.learningItemId))
        .every((card) => card.status === "suspended")
    ).toBe(true);

    const restoreResult = restoreLearningItems(["seed-item-appointment", "seed-item-sore-throat"]);

    expect(restoreResult).toEqual({
      restoredItems: 2,
      restoredCards: 2
    });
    expect(
      loadLearningItems()
        .filter((item) => ["seed-item-appointment", "seed-item-sore-throat"].includes(item.id))
        .every((item) => item.status === "active")
    ).toBe(true);
    expect(
      loadReviewCards()
        .filter((card) => ["seed-item-appointment", "seed-item-sore-throat"].includes(card.learningItemId))
        .every((card) => card.status === "new")
    ).toBe(true);

    const deleteResult = deleteLearningItems(["seed-item-appointment", "seed-item-sore-throat"]);

    expect(deleteResult).toEqual({
      deletedItems: 2,
      deletedCards: 2
    });
    expect(loadLearningItems().some((item) => item.id === "seed-item-appointment")).toBe(false);
    expect(loadLearningItems().some((item) => item.id === "seed-item-sore-throat")).toBe(false);
    expect(
      loadReviewCards().some((card) =>
        ["seed-item-appointment", "seed-item-sore-throat"].includes(card.learningItemId)
      )
    ).toBe(false);
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

  it("saves writing corrections and expressions as review cards without duplicates", () => {
    const sentenceFirst = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: "Self introduction",
      prompt: "Introduce yourself in two sentences.",
      originalText: "I am engineer.",
      correctedText: "I am an engineer.",
      text: "I am an engineer.",
      example: "I am an engineer."
    });
    const sentenceSecond = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: "Self introduction",
      prompt: "Introduce yourself in two sentences.",
      originalText: "I am engineer.",
      correctedText: "I am an engineer.",
      text: "I am an engineer.",
      example: "I am an engineer."
    });
    const expressionFirst = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: "Self introduction",
      prompt: "Introduce yourself in two sentences.",
      originalText: "I am engineer.",
      correctedText: "I am an engineer.",
      text: "an engineer",
      meaningZh: "一名工程师",
      example: "I am an engineer."
    });
    const expressionSecond = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: "Self introduction",
      prompt: "Introduce yourself in two sentences.",
      originalText: "I am engineer.",
      correctedText: "I am an engineer.",
      text: "an engineer",
      meaningZh: "一名工程师",
      example: "I am an engineer."
    });

    const sentenceCards = loadReviewCards().filter(
      (card) => card.learningItemId === sentenceFirst.item?.id
    );
    const expressionCards = loadReviewCards().filter(
      (card) => card.learningItemId === expressionFirst.item?.id
    );

    expect(sentenceFirst.created).toBe(true);
    expect(sentenceSecond.created).toBe(false);
    expect(expressionFirst.created).toBe(true);
    expect(expressionSecond.created).toBe(false);
    expect(sentenceFirst.item?.type).toBe("sentence");
    expect(sentenceFirst.item?.sourceMaterialTitle).toBe("短写作：Self introduction");
    expect(sentenceFirst.item?.meaningZh).toBe("原句：I am engineer.");
    expect(expressionFirst.item?.type).toBe("phrase");
    expect(loadLearningItems().filter((item) => item.text === "an engineer")).toHaveLength(1);
    expect(sentenceCards.map((card) => card.cardType).sort()).toEqual([
      "listening",
      "production",
      "recognition",
      "speaking"
    ]);
    expect(expressionCards.map((card) => card.cardType).sort()).toEqual([
      "listening",
      "production",
      "recognition",
      "speaking",
      "spelling"
    ]);
  });
});
