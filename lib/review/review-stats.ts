import { isCardDue } from "@/lib/review/review-store";
import type { ReviewCardRecord, ReviewCardType } from "@/lib/review/types";

export type ReviewQueueStats = {
  total: number;
  due: number;
  new: number;
  suspended: number;
  future: number;
  byType: Record<ReviewCardType, number>;
};

const emptyByType: Record<ReviewCardType, number> = {
  recognition: 0,
  listening: 0,
  spelling: 0,
  speaking: 0,
  production: 0
};

export function getReviewQueueStats(cards: ReviewCardRecord[], referenceDate = new Date()): ReviewQueueStats {
  const stats: ReviewQueueStats = {
    total: 0,
    due: 0,
    new: 0,
    suspended: 0,
    future: 0,
    byType: { ...emptyByType }
  };

  cards.forEach((card) => {
    if (card.status === "suspended") {
      stats.suspended += 1;
      return;
    }

    stats.total += 1;
    stats.byType[card.cardType] += 1;

    if (card.status === "new") {
      stats.new += 1;
    }

    if (isCardDue(card, referenceDate)) {
      stats.due += 1;
    } else {
      stats.future += 1;
    }
  });

  return stats;
}
