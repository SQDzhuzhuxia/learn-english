export function createReviewCardHref(cardId: string) {
  return `/review?card=${encodeURIComponent(cardId)}`;
}
