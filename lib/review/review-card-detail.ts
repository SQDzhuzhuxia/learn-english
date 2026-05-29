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
  sourceStudyHref?: string;
  suggestion: string;
};

const statusLabels: Record<ReviewCardRecord["status"], string> = {
  new: "新卡",
  learning: "学习中",
  review: "复习中",
  suspended: "已暂停"
};

const attentionSuggestions: Record<ReviewCardRecord["cardType"], string> = {
  recognition: "先回到原句多读两遍，确认自己能在上下文里理解这个表达，再回来复习。",
  listening: "先听原句三遍，不急着拼写；能听出关键词后，再回到这张卡。",
  spelling: "先看原句并慢慢拼一次，再遮住英文尝试写出来。",
  speaking: "先跟读原句，放慢速度把重音和停顿说清楚，再自己复述。",
  production: "先看中文意思，想一句自己的生活或工作场景，再尝试说出英文。"
};

const stableSuggestions: Record<ReviewCardRecord["cardType"], string> = {
  recognition: "这张卡最近状态还可以，继续保持短频快复习。",
  listening: "听力卡可以配合原句跟读，让输入和输出连起来。",
  spelling: "拼写卡适合少量多次，不需要一次死记很久。",
  speaking: "口语卡适合先模仿再自说，重点是自然和清楚。",
  production: "输出卡可以多换几个生活或工作场景练习。"
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
  const needsAttention = latestRating === "again" || latestRating === "hard";
  const sourceStudyHref =
    item && !item.sourceMaterialId.startsWith("writing-") ? `/study/${item.sourceMaterialId}` : undefined;

  return {
    card,
    item,
    reviewCount: cardLogs.length,
    latestRating,
    latestReviewedAt: latestLog?.reviewedAt,
    needsAttention,
    statusLabel: statusLabels[card.status],
    sourceStudyHref,
    suggestion: needsAttention ? attentionSuggestions[card.cardType] : stableSuggestions[card.cardType]
  };
}
