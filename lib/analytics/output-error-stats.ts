import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

export type OutputErrorCategoryId =
  | "pronunciation"
  | "fluency"
  | "key-information"
  | "sentence-completeness"
  | "grammar-naturalness"
  | "vocabulary"
  | "politeness";

export type OutputErrorCategory = {
  id: OutputErrorCategoryId;
  label: string;
  detail: string;
  action: string;
  count: number;
  severity: number;
  examples: string[];
};

export type OutputErrorSummary = {
  attemptCount: number;
  scoredAttemptCount: number;
  averageScore: number;
  categories: OutputErrorCategory[];
};

const CATEGORY_META: Record<
  OutputErrorCategoryId,
  {
    label: string;
    detail: string;
    action: string;
  }
> = {
  pronunciation: {
    label: "发音和听辨",
    detail: "跟读里出现漏词、误识别或重点词不稳定。",
    action: "先慢速跟读短句，再逐步恢复正常速度。"
  },
  fluency: {
    label: "流利度",
    detail: "输出可能还不够连贯，停顿和速度需要继续练。",
    action: "用同一句做 3 遍跟读或复述，目标是减少停顿。"
  },
  "key-information": {
    label: "关键信息",
    detail: "回答没有完全覆盖场景任务里的核心信息。",
    action: "先看中文任务，把时间、地点、症状、请求等信息补齐。"
  },
  "sentence-completeness": {
    label: "完整句",
    detail: "输出容易停留在单词或短语，没有形成完整句。",
    action: "优先套用 I would like to... / I have... / It works for me. 这类稳定句型。"
  },
  "grammar-naturalness": {
    label: "语法和自然度",
    detail: "写作或口语表达有中式结构、时态或搭配问题。",
    action: "保存 AI 修正版，复习时重点比较原句和自然说法。"
  },
  vocabulary: {
    label: "词汇和表达",
    detail: "输出时可用词块不足，容易想不到合适表达。",
    action: "把真实场景高频表达存进词句本，用句子复习，不孤立背单词。"
  },
  politeness: {
    label: "礼貌表达",
    detail: "生活服务场景里缺少 please、could、would like、thank you 等语气。",
    action: "把礼貌表达当作固定口语模板练熟。"
  }
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countEnglishWords(text: string) {
  const matches = normalizeText(text).match(/[a-z']+/g);

  return matches?.length ?? 0;
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function getScoreDeficit(score?: number) {
  if (score === undefined) {
    return 0;
  }

  return Math.max(0, 80 - score);
}

function addCategory(
  stats: Map<OutputErrorCategoryId, { count: number; weight: number; examples: string[] }>,
  id: OutputErrorCategoryId,
  attempt: PracticeAttemptRecord,
  weight: number
) {
  const current = stats.get(id) ?? { count: 0, weight: 0, examples: [] };
  const example = attempt.prompt || attempt.materialTitle;

  current.count += 1;
  current.weight += weight;

  if (example && !current.examples.includes(example) && current.examples.length < 2) {
    current.examples.push(example);
  }

  stats.set(id, current);
}

function inferCategories(attempt: PracticeAttemptRecord): OutputErrorCategoryId[] {
  const text = normalizeText(`${attempt.feedback ?? ""} ${attempt.transcript ?? ""} ${attempt.prompt}`);
  const wordCount = countEnglishWords(attempt.transcript ?? "");
  const scoreDeficit = getScoreDeficit(attempt.score);
  const categories = new Set<OutputErrorCategoryId>();

  if (
    attempt.type === "shadowing" &&
    (scoreDeficit > 0 || includesAny(text, ["漏掉", "误识别", "多出", "完整度", "重点词", "missing", "extra"]))
  ) {
    categories.add("pronunciation");
  }

  if (
    (attempt.type === "shadowing" || attempt.type === "retelling") &&
    (scoreDeficit >= 10 || includesAny(text, ["速度", "停顿", "流利", "fluency", "自然语气"]))
  ) {
    categories.add("fluency");
  }

  if (
    (attempt.type === "retelling" || attempt.type === "roleplay") &&
    (scoreDeficit > 0 || includesAny(text, ["关键", "待补充", "覆盖", "漏掉", "核心信息"]))
  ) {
    categories.add("key-information");
  }

  if (
    (attempt.type === "writing" || attempt.type === "retelling" || attempt.type === "roleplay") &&
    ((wordCount > 0 && wordCount < 6) || includesAny(text, ["完整句", "主语", "动作", "句子长度", "短回答"]))
  ) {
    categories.add("sentence-completeness");
  }

  if (
    attempt.type === "writing" ||
    includesAny(text, ["语法", "时态", "中式", "自然说法", "自然度", "搭配", "grammar", "natural"])
  ) {
    categories.add("grammar-naturalness");
  }

  if (
    includesAny(text, ["词", "表达", "keyword", "vocabulary", "phrase"]) ||
    ((attempt.type === "retelling" || attempt.type === "roleplay") && scoreDeficit >= 18)
  ) {
    categories.add("vocabulary");
  }

  if (
    attempt.type === "roleplay" &&
    includesAny(text, ["礼貌", "please", "would like", "could", "thank"])
  ) {
    categories.add("politeness");
  }

  return Array.from(categories);
}

export function summarizeOutputErrors(attempts: PracticeAttemptRecord[]): OutputErrorSummary {
  const stats = new Map<OutputErrorCategoryId, { count: number; weight: number; examples: string[] }>();
  const scoredAttempts = attempts.filter((attempt) => attempt.score !== undefined);
  const averageScore =
    scoredAttempts.length > 0
      ? Math.round(scoredAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / scoredAttempts.length)
      : 0;

  attempts.forEach((attempt) => {
    const weight = 1 + Math.ceil(getScoreDeficit(attempt.score) / 20);

    inferCategories(attempt).forEach((category) => {
      addCategory(stats, category, attempt, weight);
    });
  });

  const categories = Array.from(stats.entries())
    .map(([id, value]) => {
      const meta = CATEGORY_META[id];

      return {
        id,
        label: meta.label,
        detail: meta.detail,
        action: meta.action,
        count: value.count,
        severity: Math.min(100, Math.max(10, value.weight * 18)),
        examples: value.examples
      };
    })
    .sort((left, right) => right.severity - left.severity || right.count - left.count || left.label.localeCompare(right.label));

  return {
    attemptCount: attempts.length,
    scoredAttemptCount: scoredAttempts.length,
    averageScore,
    categories
  };
}
