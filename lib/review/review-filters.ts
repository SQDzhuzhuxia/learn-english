import { isCardDue } from "@/lib/review/review-store";
import type { ReviewCardRecord, ReviewCardType } from "@/lib/review/types";

export type ReviewQueueFilter = "all" | "due" | "new" | "future";
export type ReviewCardTypeFilter = ReviewCardType | "all";

export type ReviewFilterOptions = {
  queue: ReviewQueueFilter;
  cardType: ReviewCardTypeFilter;
  referenceDate?: Date;
};

export function filterReviewCards(cards: ReviewCardRecord[], options: ReviewFilterOptions) {
  const referenceDate = options.referenceDate ?? new Date();

  return cards.filter((card) => {
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

    return true;
  });
}
