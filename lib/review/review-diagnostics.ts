import type { ReviewRating } from "@/lib/review/scheduler";
import type { ReviewLogRecord } from "@/lib/review/types";

export type ReviewDailyTrend = {
  day: string;
  reviews: number;
};

export type ReviewDiagnostics = {
  totalReviews: number;
  recentReviews: number;
  successRate: number;
  attentionCount: number;
  ratingCounts: Record<ReviewRating, number>;
  dailyTrend: ReviewDailyTrend[];
  lastReviewedAt?: string;
  message: string;
};

const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const defaultRatingCounts: Record<ReviewRating, number> = {
  again: 0,
  hard: 0,
  good: 0,
  easy: 0
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return startOfLocalDay(date).toISOString().slice(0, 10);
}

function createDiagnosisMessage(input: {
  recentReviews: number;
  successRate: number;
  attentionCount: number;
}) {
  if (input.recentReviews === 0) {
    return "最近还没有复习记录，先完成几张卡片，系统就能开始判断掌握情况。";
  }

  if (input.attentionCount / input.recentReviews >= 0.4) {
    return "忘了和困难比例偏高，建议回到原材料多听多读，再复习这些卡片。";
  }

  if (input.successRate >= 75) {
    return "最近复习比较顺，适合继续增加真实输入和少量输出练习。";
  }

  return "复习状态正常，继续保持每天短时间、多轮次的节奏。";
}

export function summarizeReviewLogs(
  logs: ReviewLogRecord[],
  referenceDate = new Date(),
  days = 7
): ReviewDiagnostics {
  const today = startOfLocalDay(referenceDate);
  const startDate = addDays(today, -(days - 1));
  const endDate = addDays(today, 1);
  const trendDays = Array.from({ length: days }, (_, index) => addDays(startDate, index));
  const trend = trendDays.map((day) => ({
    day: DAY_LABELS[day.getDay()],
    reviews: 0
  }));
  const trendIndex = new Map(trendDays.map((day, index) => [dateKey(day), index]));
  const ratingCounts = { ...defaultRatingCounts };
  let lastReviewedAt: string | undefined;

  logs.forEach((log) => {
    const reviewedAt = new Date(log.reviewedAt);

    if (!lastReviewedAt || reviewedAt.getTime() > new Date(lastReviewedAt).getTime()) {
      lastReviewedAt = log.reviewedAt;
    }

    if (reviewedAt < startDate || reviewedAt >= endDate) {
      return;
    }

    ratingCounts[log.rating] += 1;
    const index = trendIndex.get(dateKey(reviewedAt));

    if (index !== undefined) {
      trend[index].reviews += 1;
    }
  });

  const recentReviews = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0);
  const successfulReviews = ratingCounts.good + ratingCounts.easy;
  const attentionCount = ratingCounts.again + ratingCounts.hard;
  const successRate = recentReviews > 0 ? Math.round((successfulReviews / recentReviews) * 100) : 0;

  return {
    totalReviews: logs.length,
    recentReviews,
    successRate,
    attentionCount,
    ratingCounts,
    dailyTrend: trend,
    lastReviewedAt,
    message: createDiagnosisMessage({
      recentReviews,
      successRate,
      attentionCount
    })
  };
}
