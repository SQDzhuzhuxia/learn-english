import { isCardDue } from "@/lib/review/review-store";
import type { ReviewCardRecord, ReviewCardType, ReviewLogRecord } from "@/lib/review/types";

export type ReviewQueueFilter = "all" | "due" | "new" | "future" | "attention" | "paused";
export type ReviewCardTypeFilter = ReviewCardType | "all";

export type ReviewFilterOptions = {
  queue: ReviewQueueFilter;
  cardType: ReviewCardTypeFilter;
  logs?: ReviewLogRecord[];
  referenceDate?: Date;
};

function getLatestRatingForCard(cardId: string, logs: ReviewLogRecord[] = []) {
  return logs.reduce<ReviewLogRecord | undefined>((latest, log) => {
    if (log.cardId !== cardId) {
      return latest;
    }

    if (!latest || new Date(log.reviewedAt).getTime() > new Date(latest.reviewedAt).getTime()) {
      return log;
    }

    return latest;
  }, undefined)?.rating;
}

export function filterReviewCards(cards: ReviewCardRecord[], options: ReviewFilterOptions) {
  const referenceDate = options.referenceDate ?? new Date();

  return cards.filter((card) => {
    if (options.queue === "paused") {
      return (
        card.status === "suspended" &&
        (options.cardType === "all" || card.cardType === options.cardType)
      );
    }

    if (card.status === "suspended") {
      return false;
    }

    if (options.cardType !== "all" && card.cardType !== options.cardType) {
      return false;
    }

    if (options.queue === "due") {
      return isCardDue(card, referenceDate);
    }

    if (options.queue === "new") {
      return card.status === "new";
    }

    if (options.queue === "future") {
      return !isCardDue(card, referenceDate);
    }

    if (options.queue === "attention") {
      const latestRating = getLatestRatingForCard(card.id, options.logs);
      return latestRating === "again" || latestRating === "hard";
    }

    return true;
  });
}
