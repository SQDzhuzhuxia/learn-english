"use client";

import { recordStudyActivity } from "@/lib/analytics/progress-store";
import { getNextReviewDate, getReviewIntervalDays } from "@/lib/review/scheduler";
import type { MaterialSegment, StudyMaterialRecord } from "@/lib/content/types";
import type {
  LearningItemType,
  LearningItemRecord,
  ReviewCardType,
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

function createTypedCardId(baseCardId: string, cardType: ReviewCardType) {
  return cardType === "recognition" ? baseCardId : `${baseCardId}-${cardType}`;
}

function createReviewCardId(materialId: string, segmentId: string, cardType: ReviewCardType = "recognition") {
  return createTypedCardId(`card-${materialId}-${segmentId}`, cardType);
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

function createExpressionReviewCardId(
  materialId: string,
  segmentId: string,
  expressionText: string,
  cardType: ReviewCardType = "recognition"
) {
  return createTypedCardId(
    `card-${materialId}-${segmentId}-expr-${createStableTextHash(expressionText.toLowerCase())}`,
    cardType
  );
}

function createWritingSourceMaterialId(promptTitle: string) {
  return `writing-${createStableTextHash(promptTitle.toLowerCase())}`;
}

function createWritingSourceSegmentId(kind: SaveWritingItemKind, text: string) {
  return `${kind}-${createStableTextHash(text.toLowerCase())}`;
}

function createWritingLearningItemId(sourceMaterialId: string, sourceSegmentId: string, text: string) {
  return `item-${sourceMaterialId}-${sourceSegmentId}-${createStableTextHash(text.toLowerCase())}`;
}

function createWritingReviewCardId(
  sourceMaterialId: string,
  sourceSegmentId: string,
  text: string,
  cardType: ReviewCardType = "recognition"
) {
  return createTypedCardId(
    `card-${sourceMaterialId}-${sourceSegmentId}-${createStableTextHash(text.toLowerCase())}`,
    cardType
  );
}

function createReviewCardRecord(input: {
  id: string;
  learningItemId: string;
  cardType: ReviewCardType;
  front: string;
  back: string;
  example: string;
  source: string;
  timestamp: string;
}): ReviewCardRecord {
  return {
    id: input.id,
    learningItemId: input.learningItemId,
    cardType: input.cardType,
    front: input.front,
    back: input.back,
    example: input.example,
    source: input.source,
    dueAt: input.timestamp,
    intervalDays: 0,
    ease: 2.5,
    status: "new",
    createdAt: input.timestamp,
    updatedAt: input.timestamp
  };
}

function createReviewCardsForLearningItem(input: {
  baseCardId: string;
  item: LearningItemRecord;
  source: string;
  timestamp: string;
}) {
  const answer = input.item.meaningZh || input.item.meaningEn || "待 AI 解释";
  const hasMeaning = Boolean(input.item.meaningZh || input.item.meaningEn);
  const cards: ReviewCardRecord[] = [
    createReviewCardRecord({
      id: createTypedCardId(input.baseCardId, "recognition"),
      learningItemId: input.item.id,
      cardType: "recognition",
      front: input.item.text,
      back: answer,
      example: input.item.contextText,
      source: input.source,
      timestamp: input.timestamp
    })
  ];

  if (hasMeaning) {
    cards.push(
      createReviewCardRecord({
        id: createTypedCardId(input.baseCardId, "production"),
        learningItemId: input.item.id,
        cardType: "production",
        front: answer,
        back: input.item.text,
        example: input.item.contextText,
        source: input.source,
        timestamp: input.timestamp
      })
    );
  }

  if (input.item.type === "word" || input.item.type === "phrase") {
    cards.push(
      createReviewCardRecord({
        id: createTypedCardId(input.baseCardId, "spelling"),
        learningItemId: input.item.id,
        cardType: "spelling",
        front: `拼写这个表达：${answer}`,
        back: input.item.text,
        example: input.item.contextText,
        source: input.source,
        timestamp: input.timestamp
      })
    );
  }

  if (input.item.type === "sentence" || input.item.type === "phrase") {
    cards.push(
      createReviewCardRecord({
        id: createTypedCardId(input.baseCardId, "speaking"),
        learningItemId: input.item.id,
        cardType: "speaking",
        front: `跟读并说清楚：${input.item.text}`,
        back: input.item.text,
        example: input.item.contextText,
        source: input.source,
        timestamp: input.timestamp
      }),
      createReviewCardRecord({
        id: createTypedCardId(input.baseCardId, "listening"),
        learningItemId: input.item.id,
        cardType: "listening",
        front: "听后写出或说出这个表达",
        back: input.item.text,
        example: input.item.contextText,
        source: input.source,
        timestamp: input.timestamp
      })
    );
  }

  return cards;
}

export function saveSegmentAsReviewCard(material: StudyMaterialRecord, segment: MaterialSegment) {
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const existingItem = items.find(
    (item) =>
      item.sourceMaterialId === material.id &&
      item.sourceSegmentId === segment.id &&
      item.text.trim().toLowerCase() === segment.text.trim().toLowerCase() &&
      item.status !== "archived"
  );
  const existingLinkedCard = existingItem
    ? cards.find((card) => card.learningItemId === existingItem.id)
    : undefined;

  if (existingItem && existingLinkedCard) {
    return {
      item: existingItem,
      card: existingLinkedCard,
      cards: cards.filter((card) => card.learningItemId === existingItem.id),
      created: false
    };
  }

  const learningItemId = existingItem?.id ?? createLearningItemId(material.id, segment.id);
  const reviewCardId = createReviewCardId(material.id, segment.id);
  const timestamp = nowIso();
  const existingCard = cards.find((card) => card.id === reviewCardId);

  if (existingCard) {
    return {
      item: items.find((item) => item.id === learningItemId),
      card: existingCard,
      cards: cards.filter((card) => card.learningItemId === learningItemId),
      created: false
    };
  }

  const item: LearningItemRecord =
    existingItem ?? {
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

  const reviewCards = createReviewCardsForLearningItem({
    baseCardId: reviewCardId,
    item,
    source: material.title,
    timestamp
  });

  saveLearningItems(existingItem ? items : [item, ...items]);
  saveReviewCards([...reviewCards, ...cards]);
  recordStudyActivity({
    type: "asset",
    label: `保存句子：${segment.text}`,
    materialId: material.id,
    materialTitle: material.title
  });

  return {
    item,
    card: reviewCards[0],
    cards: reviewCards,
    created: true
  };
}

export type SaveExpressionInput = {
  text: string;
  meaningZh?: string;
  example?: string;
};

export type SaveWritingItemKind = "corrected-sentence" | "expression";

export type SaveWritingItemInput = {
  kind: SaveWritingItemKind;
  promptTitle: string;
  prompt?: string;
  originalText?: string;
  correctedText?: string;
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
      cards: cards.filter((card) => card.learningItemId === existingItem.id),
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
      cards: cards.filter((card) => card.learningItemId === learningItemId),
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

  const reviewCards = createReviewCardsForLearningItem({
    baseCardId: reviewCardId,
    item,
    source: material.title,
    timestamp
  });

  saveLearningItems(existingItem ? items : [item, ...items]);
  saveReviewCards([...reviewCards, ...cards]);
  recordStudyActivity({
    type: "asset",
    label: `保存表达：${expressionText}`,
    materialId: material.id,
    materialTitle: material.title
  });

  return {
    item,
    card: reviewCards[0],
    cards: reviewCards,
    created: true
  };
}

export function saveWritingItemAsReviewCard(input: SaveWritingItemInput) {
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const text = input.text.trim();
  const promptTitle = input.promptTitle.trim() || "短写作";

  if (!text) {
    return {
      item: undefined,
      card: undefined,
      created: false
    };
  }

  const sourceMaterialId = createWritingSourceMaterialId(promptTitle);
  const sourceSegmentId = createWritingSourceSegmentId(input.kind, text);
  const sourceMaterialTitle = `短写作：${promptTitle}`;
  const contextText =
    input.example?.trim() ||
    input.correctedText?.trim() ||
    input.originalText?.trim() ||
    input.prompt?.trim() ||
    text;
  const meaningZh =
    input.meaningZh?.trim() ||
    (input.kind === "corrected-sentence" && input.originalText?.trim()
      ? `原句：${input.originalText.trim()}`
      : "待 AI 解释");

  const existingItem = items.find(
    (item) =>
      item.sourceMaterialId === sourceMaterialId &&
      item.sourceSegmentId === sourceSegmentId &&
      item.text.trim().toLowerCase() === text.toLowerCase() &&
      item.status !== "archived"
  );
  const existingLinkedCard = existingItem
    ? cards.find((card) => card.learningItemId === existingItem.id)
    : undefined;

  if (existingItem && existingLinkedCard) {
    return {
      item: existingItem,
      card: existingLinkedCard,
      cards: cards.filter((card) => card.learningItemId === existingItem.id),
      created: false
    };
  }

  const learningItemId =
    existingItem?.id ?? createWritingLearningItemId(sourceMaterialId, sourceSegmentId, text);
  const reviewCardId = createWritingReviewCardId(sourceMaterialId, sourceSegmentId, text);
  const timestamp = nowIso();
  const existingCard = cards.find((card) => card.id === reviewCardId);

  if (existingCard) {
    return {
      item: items.find((item) => item.id === learningItemId),
      card: existingCard,
      cards: cards.filter((card) => card.learningItemId === learningItemId),
      created: false
    };
  }

  const item: LearningItemRecord =
    existingItem ?? {
      id: learningItemId,
      type:
        input.kind === "corrected-sentence"
          ? "sentence"
          : text.includes(" ")
            ? "phrase"
            : "word",
      text,
      meaningZh,
      sourceMaterialId,
      sourceMaterialTitle,
      sourceSegmentId,
      contextText,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };

  const reviewCards = createReviewCardsForLearningItem({
    baseCardId: reviewCardId,
    item,
    source: sourceMaterialTitle,
    timestamp
  });

  saveLearningItems(existingItem ? items : [item, ...items]);
  saveReviewCards([...reviewCards, ...cards]);
  recordStudyActivity({
    type: "asset",
    label:
      input.kind === "corrected-sentence"
        ? `保存写作句子：${text}`
        : `保存写作表达：${text}`,
    materialId: sourceMaterialId,
    materialTitle: sourceMaterialTitle
  });

  return {
    item,
    card: reviewCards[0],
    cards: reviewCards,
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

export function archiveLearningItems(itemIds: string[]) {
  const timestamp = nowIso();
  const targetIds = new Set(itemIds);
  const items = loadLearningItems();
  const itemIdsToArchive = new Set(
    items
      .filter((item) => targetIds.has(item.id) && item.status !== "archived")
      .map((item) => item.id)
  );

  if (itemIdsToArchive.size === 0) {
    return {
      archivedItems: 0,
      suspendedCards: 0
    };
  }

  saveLearningItems(
    items.map((item) =>
      itemIdsToArchive.has(item.id)
        ? {
            ...item,
            status: "archived" as const,
            archivedAt: timestamp,
            updatedAt: timestamp
          }
        : item
    )
  );

  let suspendedCards = 0;
  saveReviewCards(
    loadReviewCards().map((card) => {
      if (!itemIdsToArchive.has(card.learningItemId) || card.status === "suspended") {
        return card;
      }

      suspendedCards += 1;

      return {
        ...card,
        status: "suspended" as const,
        updatedAt: timestamp
      };
    })
  );

  return {
    archivedItems: itemIdsToArchive.size,
    suspendedCards
  };
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

export function restoreLearningItems(itemIds: string[]) {
  const timestamp = nowIso();
  const targetIds = new Set(itemIds);
  const items = loadLearningItems();
  const itemIdsToRestore = new Set(
    items
      .filter((item) => targetIds.has(item.id) && item.status === "archived")
      .map((item) => item.id)
  );

  if (itemIdsToRestore.size === 0) {
    return {
      restoredItems: 0,
      restoredCards: 0
    };
  }

  saveLearningItems(
    items.map((item) =>
      itemIdsToRestore.has(item.id)
        ? {
            ...item,
            status: "active" as const,
            archivedAt: undefined,
            updatedAt: timestamp
          }
        : item
    )
  );

  let restoredCards = 0;
  saveReviewCards(
    loadReviewCards().map((card) => {
      if (!itemIdsToRestore.has(card.learningItemId) || card.status !== "suspended") {
        return card;
      }

      restoredCards += 1;

      return {
        ...card,
        status: card.intervalDays > 0 ? "review" : "new",
        updatedAt: timestamp
      };
    })
  );

  return {
    restoredItems: itemIdsToRestore.size,
    restoredCards
  };
}

export function suspendReviewCard(cardId: string) {
  const timestamp = nowIso();
  let suspendedCard: ReviewCardRecord | undefined;

  const updatedCards = loadReviewCards().map((card) => {
    if (card.id !== cardId || card.status === "suspended") {
      return card;
    }

    suspendedCard = {
      ...card,
      status: "suspended",
      updatedAt: timestamp
    };

    return suspendedCard;
  });

  saveReviewCards(updatedCards);
  return suspendedCard;
}

export function restoreReviewCard(cardId: string) {
  const timestamp = nowIso();
  let restoredCard: ReviewCardRecord | undefined;

  const updatedCards = loadReviewCards().map((card) => {
    if (card.id !== cardId || card.status !== "suspended") {
      return card;
    }

    restoredCard = {
      ...card,
      status: card.intervalDays > 0 ? "review" : "new",
      updatedAt: timestamp
    };

    return restoredCard;
  });

  saveReviewCards(updatedCards);
  return restoredCard;
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

export function deleteLearningItems(itemIds: string[]) {
  const targetIds = new Set(itemIds);
  const items = loadLearningItems();
  const cards = loadReviewCards();
  const cardsToDelete = cards.filter((card) => targetIds.has(card.learningItemId));
  const cardIdsToDelete = new Set(cardsToDelete.map((card) => card.id));
  const nextItems = items.filter((item) => !targetIds.has(item.id));
  const nextCards = cards.filter((card) => !targetIds.has(card.learningItemId));
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
    recordStudyActivity({
      type: "review",
      label: `复习：${updatedCard.front}`,
      minutes: 1,
      materialTitle: updatedCard.source
    });
  }

  return updatedCard;
}
