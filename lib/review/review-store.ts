"use client";

import { getNextReviewDate, getReviewIntervalDays } from "@/lib/review/scheduler";
import type { MaterialSegment, StudyMaterialRecord } from "@/lib/content/types";
import type {
  LearningItemType,
  LearningItemRecord,
  ReviewCardRecord,
  ReviewLogRecord
} from "@/lib/review/types";
import type { ReviewRating } from "@/lib/review/scheduler";

const LEARNING_ITEMS_KEY = "learn-english.learning-items.v1";
const REVIEW_CARDS_KEY = "learn-english.review-cards.v1";
const REVIEW_LOGS_KEY = "learn-english.review-logs.v1";

function nowIso() {
  return new Date().toISOString();
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getSeedLearningItems(): LearningItemRecord[] {
  return [
    {
      id: "seed-item-appointment",
      type: "phrase",
      text: "make an appointment",
      meaningZh: "预约",
      meaningEn: "to arrange a time to meet or receive a service",
      sourceMaterialId: "doctor-visit",
      sourceMaterialTitle: "A Visit to the Doctor",
      sourceSegmentId: "s2",
      contextText: "I would like to make an appointment with a doctor.",
      status: "active",
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z"
    },
    {
      id: "seed-item-sore-throat",
      type: "phrase",
      text: "sore throat",
      meaningZh: "嗓子疼",
      meaningEn: "pain or irritation in the throat",
      sourceMaterialId: "doctor-visit",
      sourceMaterialTitle: "A Visit to the Doctor",
      sourceSegmentId: "s1",
      contextText: "I have had a sore throat since yesterday.",
      status: "active",
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z"
    },
    {
      id: "seed-item-spell-name",
      type: "sentence",
      text: "Could you please spell your last name?",
      meaningZh: "请拼一下你的姓好吗？",
      sourceMaterialId: "doctor-visit",
      sourceMaterialTitle: "A Visit to the Doctor",
      sourceSegmentId: "s4",
      contextText: "Could you please spell your last name?",
      status: "active",
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z"
    }
  ];
}

export function getSeedReviewCards(): ReviewCardRecord[] {
  const createdAt = "2026-05-28T00:00:00.000Z";

  return [
    {
      id: "seed-card-appointment",
      learningItemId: "seed-item-appointment",
      cardType: "recognition",
      front: "make an appointment",
      back: "预约",
      example: "I would like to make an appointment with a doctor.",
      source: "A Visit to the Doctor",
      dueAt: createdAt,
      intervalDays: 0,
      ease: 2.5,
      status: "new",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "seed-card-sore-throat",
      learningItemId: "seed-item-sore-throat",
      cardType: "recognition",
      front: "sore throat",
      back: "嗓子疼",
      example: "I have had a sore throat since yesterday.",
      source: "A Visit to the Doctor",
      dueAt: createdAt,
      intervalDays: 0,
      ease: 2.5,
      status: "new",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "seed-card-spell-name",
      learningItemId: "seed-item-spell-name",
      cardType: "production",
      front: "请拼一下你的姓好吗？",
      back: "Could you please spell your last name?",
      example: "Could you please spell your last name?",
      source: "A Visit to the Doctor",
      dueAt: createdAt,
      intervalDays: 0,
      ease: 2.5,
      status: "new",
      createdAt,
      updatedAt: createdAt
    }
  ];
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeLearningItems(items: LearningItemRecord[]) {
  return items.map((item) => ({
    ...item,
    status: item.status ?? "active",
    updatedAt: item.updatedAt ?? item.createdAt
  }));
}

export function loadLearningItems() {
  const items = normalizeLearningItems(
    readJson<LearningItemRecord[]>(LEARNING_ITEMS_KEY, getSeedLearningItems())
  );

  if (canUseStorage()) {
    saveLearningItems(items);
  }

  return items;
}

export function saveLearningItems(items: LearningItemRecord[]) {
  writeJson(LEARNING_ITEMS_KEY, items);
}

export function loadReviewCards() {
  return readJson<ReviewCardRecord[]>(REVIEW_CARDS_KEY, getSeedReviewCards());
}

export function saveReviewCards(cards: ReviewCardRecord[]) {
  writeJson(REVIEW_CARDS_KEY, cards);
}

export function loadReviewLogs() {
  return readJson<ReviewLogRecord[]>(REVIEW_LOGS_KEY, []);
}

export function saveReviewLogs(logs: ReviewLogRecord[]) {
  writeJson(REVIEW_LOGS_KEY, logs);
}

function createLearningItemId(materialId: string, segmentId: string) {
  return `item-${materialId}-${segmentId}`;
}

function createReviewCardId(materialId: string, segmentId: string) {
  return `card-${materialId}-${segmentId}`;
}

function createStableTextHash(text: string) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function createExpressionLearningItemId(materialId: string, segmentId: string, expressionText: string) {
  return `item-${materialId}-${segmentId}-expr-${createStableTextHash(expressionText.toLowerCase())}`;
}

function createExpressionReviewCardId(materialId: string, segmentId: string, expressionText: string) {
  return `card-${materialId}-${segmentId}-expr-${createStableTextHash(expressionText.toLowerCase())}`;
}

export function saveSegmentAsReviewCard(material: StudyMaterialRecord, segment: MaterialSegment) {
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const learningItemId = createLearningItemId(material.id, segment.id);
  const reviewCardId = createReviewCardId(material.id, segment.id);
  const timestamp = nowIso();
  const existingCard = cards.find((card) => card.id === reviewCardId);

  if (existingCard) {
    return {
      item: items.find((item) => item.id === learningItemId),
      card: existingCard,
      created: false
    };
  }

  const item: LearningItemRecord = {
    id: learningItemId,
    type: "sentence",
    text: segment.text,
    meaningZh: segment.translation,
    sourceMaterialId: material.id,
    sourceMaterialTitle: material.title,
    sourceSegmentId: segment.id,
    contextText: segment.text,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const card: ReviewCardRecord = {
    id: reviewCardId,
    learningItemId,
    cardType: "recognition",
    front: segment.text,
    back: segment.translation ?? "待 AI 解释",
    example: segment.text,
    source: material.title,
    dueAt: timestamp,
    intervalDays: 0,
    ease: 2.5,
    status: "new",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  saveLearningItems([item, ...items]);
  saveReviewCards([card, ...cards]);

  return {
    item,
    card,
    created: true
  };
}

export type SaveExpressionInput = {
  text: string;
  meaningZh?: string;
  example?: string;
};

export function saveExpressionAsReviewCard(
  material: StudyMaterialRecord,
  segment: MaterialSegment,
  expression: SaveExpressionInput
) {
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const expressionText = expression.text.trim();
  const meaningZh = expression.meaningZh?.trim() || "待 AI 解释";
  const example = expression.example?.trim() || segment.text;

  if (!expressionText) {
    return {
      item: undefined,
      card: undefined,
      created: false
    };
  }

  const existingItem = items.find(
    (item) =>
      item.sourceMaterialId === material.id &&
      item.sourceSegmentId === segment.id &&
      item.text.trim().toLowerCase() === expressionText.toLowerCase() &&
      item.status !== "archived"
  );
  const existingLinkedCard = existingItem
    ? cards.find((card) => card.learningItemId === existingItem.id)
    : undefined;

  if (existingItem && existingLinkedCard) {
    return {
      item: existingItem,
      card: existingLinkedCard,
      created: false
    };
  }

  const learningItemId =
    existingItem?.id ?? createExpressionLearningItemId(material.id, segment.id, expressionText);
  const reviewCardId = createExpressionReviewCardId(material.id, segment.id, expressionText);
  const timestamp = nowIso();
  const existingCard = cards.find((card) => card.id === reviewCardId);

  if (existingCard) {
    return {
      item: items.find((item) => item.id === learningItemId),
      card: existingCard,
      created: false
    };
  }

  const item: LearningItemRecord =
    existingItem ?? {
      id: learningItemId,
      type: expressionText.includes(" ") ? "phrase" : "word",
      text: expressionText,
      meaningZh,
      sourceMaterialId: material.id,
      sourceMaterialTitle: material.title,
      sourceSegmentId: segment.id,
      contextText: example,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };

  const card: ReviewCardRecord = {
    id: reviewCardId,
    learningItemId,
    cardType: "recognition",
    front: expressionText,
    back: meaningZh,
    example,
    source: material.title,
    dueAt: timestamp,
    intervalDays: 0,
    ease: 2.5,
    status: "new",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  saveLearningItems(existingItem ? items : [item, ...items]);
  saveReviewCards([card, ...cards]);

  return {
    item,
    card,
    created: true
  };
}

export type LearningItemUpdateInput = {
  type: LearningItemType;
  text: string;
  meaningZh?: string;
  meaningEn?: string;
  contextText: string;
};

export function updateLearningItem(itemId: string, updates: LearningItemUpdateInput) {
  const timestamp = nowIso();
  let updatedItem: LearningItemRecord | undefined;

  const updatedItems = loadLearningItems().map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    updatedItem = {
      ...item,
      ...updates,
      updatedAt: timestamp
    };

    return updatedItem;
  });

  saveLearningItems(updatedItems);

  if (updatedItem) {
    const updatedCards = loadReviewCards().map((card) => {
      if (card.learningItemId !== itemId) {
        return card;
      }

      return {
        ...card,
        front: updatedItem?.text ?? card.front,
        back: updatedItem?.meaningZh || updatedItem?.meaningEn || card.back,
        example: updatedItem?.contextText ?? card.example,
        updatedAt: timestamp
      };
    });

    saveReviewCards(updatedCards);
  }

  return updatedItem;
}

export function archiveLearningItem(itemId: string) {
  const timestamp = nowIso();
  let archivedItem: LearningItemRecord | undefined;

  const updatedItems = loadLearningItems().map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    archivedItem = {
      ...item,
      status: "archived",
      archivedAt: timestamp,
      updatedAt: timestamp
    };

    return archivedItem;
  });

  saveLearningItems(updatedItems);
  saveReviewCards(
    loadReviewCards().map((card) =>
      card.learningItemId === itemId
        ? {
            ...card,
            status: "suspended",
            updatedAt: timestamp
          }
        : card
    )
  );

  return archivedItem;
}

export function restoreLearningItem(itemId: string) {
  const timestamp = nowIso();
  let restoredItem: LearningItemRecord | undefined;

  const updatedItems = loadLearningItems().map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    restoredItem = {
      ...item,
      status: "active",
      archivedAt: undefined,
      updatedAt: timestamp
    };

    return restoredItem;
  });

  saveLearningItems(updatedItems);
  saveReviewCards(
    loadReviewCards().map((card) =>
      card.learningItemId === itemId
        ? {
            ...card,
            status: card.intervalDays > 0 ? "review" : "new",
            updatedAt: timestamp
          }
        : card
    )
  );

  return restoredItem;
}

export function deleteLearningItem(itemId: string) {
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const cardsToDelete = cards.filter((card) => card.learningItemId === itemId);
  const cardIdsToDelete = new Set(cardsToDelete.map((card) => card.id));
  const nextItems = items.filter((item) => item.id !== itemId);
  const nextCards = cards.filter((card) => card.learningItemId !== itemId);
  const nextLogs = loadReviewLogs().filter((log) => !cardIdsToDelete.has(log.cardId));

  saveLearningItems(nextItems);
  saveReviewCards(nextCards);
  saveReviewLogs(nextLogs);

  return {
    deletedItems: items.length - nextItems.length,
    deletedCards: cardsToDelete.length
  };
}

export function archiveLearningItemsByMaterialId(materialId: string) {
  const timestamp = nowIso();
  const items = loadLearningItems();
  const relatedItemIds = new Set(
    items
      .filter((item) => item.sourceMaterialId === materialId && item.status !== "archived")
      .map((item) => item.id)
  );

  if (relatedItemIds.size === 0) {
    return {
      archivedItems: 0,
      suspendedCards: 0
    };
  }

  const updatedItems = items.map((item) =>
    relatedItemIds.has(item.id)
      ? {
          ...item,
          status: "archived" as const,
          archivedAt: timestamp,
          updatedAt: timestamp
        }
      : item
  );

  let suspendedCards = 0;
  const updatedCards = loadReviewCards().map((card) => {
    if (!relatedItemIds.has(card.learningItemId) || card.status === "suspended") {
      return card;
    }

    suspendedCards += 1;

    return {
      ...card,
      status: "suspended" as const,
      updatedAt: timestamp
    };
  });

  saveLearningItems(updatedItems);
  saveReviewCards(updatedCards);

  return {
    archivedItems: relatedItemIds.size,
    suspendedCards
  };
}

export function isCardDue(card: ReviewCardRecord, referenceDate = new Date()) {
  return new Date(card.dueAt).getTime() <= referenceDate.getTime();
}

export function reviewCard(cardId: string, rating: ReviewRating) {
  const cards = loadReviewCards();
  const reviewedAt = new Date();
  const nextDueAt = getNextReviewDate(rating, reviewedAt);
  const intervalDays = getReviewIntervalDays(rating);
  let updatedCard: ReviewCardRecord | undefined;

  const updatedCards = cards.map((card) => {
    if (card.id !== cardId) {
      return card;
    }

    updatedCard = {
      ...card,
      dueAt: nextDueAt.toISOString(),
      intervalDays,
      status: "review",
      updatedAt: reviewedAt.toISOString()
    };

    return updatedCard;
  });

  saveReviewCards(updatedCards);

  if (updatedCard) {
    const logs = loadReviewLogs();
    const log: ReviewLogRecord = {
      id: `log-${cardId}-${reviewedAt.getTime()}`,
      cardId,
      rating,
      reviewedAt: reviewedAt.toISOString(),
      nextDueAt: nextDueAt.toISOString()
    };
    saveReviewLogs([log, ...logs]);
  }

  return updatedCard;
}
