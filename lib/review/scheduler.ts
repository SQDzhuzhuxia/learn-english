export type ReviewRating = "again" | "hard" | "good" | "easy";

const DAY_MS = 24 * 60 * 60 * 1000;

const ratingIntervals: Record<ReviewRating, number> = {
  again: 0,
  hard: 1,
  good: 4,
  easy: 7
};

export function getNextReviewDate(rating: ReviewRating, reviewedAt = new Date()) {
  const intervalDays = ratingIntervals[rating];

  if (rating === "again") {
    return new Date(reviewedAt.getTime() + 6 * 60 * 60 * 1000);
  }

  return new Date(reviewedAt.getTime() + intervalDays * DAY_MS);
}

export function getReviewIntervalDays(rating: ReviewRating) {
  return ratingIntervals[rating];
}
