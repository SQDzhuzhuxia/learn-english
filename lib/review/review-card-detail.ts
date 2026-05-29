import type { ReviewRating } from "@/lib/review/scheduler";
import type { LearningItemRecord, ReviewCardRecord, ReviewLogRecord } from "@/lib/review/types";

export type ReviewCardDetail = {
  card: ReviewCardRecord;
  item?: LearningItemRecord;
  reviewCount: number;
  latestRating?: ReviewRating;
  latestReviewedAt?: string;
  needsAttention: boolean;
  statusLabel: string;
};

const statusLabels: Record<ReviewCardRecord["status"], string> = {
  new: "新卡",
  learning: "学习中",
  review: "复习中",
  suspended: "已暂停"
};

function getLatestLog(logs: ReviewLogRecord[]) {
  return logs.reduce<ReviewLogRecord | undefined>((latest, log) => {
    if (!latest || new Date(log.reviewedAt).getTime() > new Date(latest.reviewedAt).getTime()) {
      return log;
    }

    return latest;
  }, undefined);
}

export function getReviewCardDetail(
  card: ReviewCardRecord,
  items: LearningItemRecord[],
  logs: ReviewLogRecord[]
): ReviewCardDetail {
  const item = items.find((record) => record.id === card.learningItemId);
  const cardLogs = logs.filter((log) => log.cardId === card.id);
  const latestLog = getLatestLog(cardLogs);
  const latestRating = latestLog?.rating;

  return {
    card,
    item,
    reviewCount: cardLogs.length,
    latestRating,
    latestReviewedAt: latestLog?.reviewedAt,
    needsAttention: latestRating === "again" || latestRating === "hard",
    statusLabel: statusLabels[card.status]
  };
}
