import { describe, expect, it } from "vitest";
import { createReviewCardHref } from "@/lib/review/review-links";

describe("createReviewCardHref", () => {
  it("creates a deep link for a review card", () => {
    expect(createReviewCardHref("card-1")).toBe("/review?card=card-1");
  });

  it("encodes card ids for query string use", () => {
    expect(createReviewCardHref("card with spaces")).toBe("/review?card=card%20with%20spaces");
  });
});
