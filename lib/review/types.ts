import type { ReviewRating } from "@/lib/review/scheduler";

export type LearningItemType = "word" | "phrase" | "sentence" | "pattern" | "error";

export type LearningItemRecord = {
  id: string;
  type: LearningItemType;
  text: string;
  meaningZh?: string;
  meaningEn?: string;
  sourceMaterialId: string;
  sourceMaterialTitle: string;
  sourceSegmentId: string;
  contextText: string;
  createdAt: string;
};

export type ReviewCardType = "recognition" | "listening" | "spelling" | "speaking" | "production";

export type ReviewCardRecord = {
  id: string;
  learningItemId: string;
  cardType: ReviewCardType;
  front: string;
  back: string;
  example: string;
  source: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  status: "new" | "learning" | "review" | "suspended";
  createdAt: string;
  updatedAt: string;
};

export type ReviewLogRecord = {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  nextDueAt: string;
};
