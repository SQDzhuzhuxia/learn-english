export type RoleplayFeedbackInput = {
  reply: string;
  expectedKeywords: string[];
  suggestedReply: string;
};

export type RoleplayFeedback = {
  score: number;
  label: string;
  tip: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  naturalReply: string;
  originalReply: string;
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasKeyword(normalizedReply: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  return normalizedReply.includes(normalizedKeyword);
}

function hasPoliteSignal(normalizedReply: string) {
  return ["please", "would like", "could", "can i", "thank"].some((signal) =>
    normalizedReply.includes(signal)
  );
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function createRoleplayFeedback(input: RoleplayFeedbackInput): RoleplayFeedback {
  const originalReply = input.reply.trim();
  const normalizedReply = normalizeText(originalReply);
  const words = normalizedReply ? normalizedReply.split(/\s+/) : [];
  const matchedKeywords = input.expectedKeywords.filter((keyword) => hasKeyword(normalizedReply, keyword));
  const missingKeywords = input.expectedKeywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const keywordScore = input.expectedKeywords.length
    ? (matchedKeywords.length / input.expectedKeywords.length) * 48
    : 32;
  const lengthScore = Math.min(words.length / 7, 1) * 22;
  const politeScore = hasPoliteSignal(normalizedReply) ? 15 : 0;
  const sentenceScore = /\b(i|my|this|that|yes|no|it)\b/.test(normalizedReply) ? 15 : 5;
  const score = clampScore(keywordScore + lengthScore + politeScore + sentenceScore);
  const suggestions: string[] = [];

  if (!originalReply) {
    suggestions.push("先说一个完整短句，不会也可以照着推荐句说。");
  }

  if (missingKeywords.length > 0) {
    suggestions.push(`下一遍补上关键信息：${missingKeywords.join(", ")}。`);
  }

  if (words.length > 0 && words.length < 5) {
    suggestions.push("尽量说完整句，至少包含主语、动作和关键信息。");
  }

  if (originalReply && !hasPoliteSignal(normalizedReply)) {
    suggestions.push("美国生活服务场景里，可以多用 would like、could、please 让语气更自然。");
  }

  if (suggestions.length === 0) {
    suggestions.push("这一轮已经能完成沟通，下一遍练更自然的停顿和语气。");
  }

  const label = score >= 82 ? "可以真实使用" : score >= 62 ? "基本能沟通" : "需要支架";
  const tip =
    score >= 82
      ? "表达已经比较完整，适合继续练速度和自然度。"
      : score >= 62
        ? "意思基本说出来了，下一遍补齐关键词会更稳。"
        : "先用推荐句建立肌肉记忆，再慢慢替换成自己的表达。";

  return {
    score,
    label,
    tip,
    matchedKeywords,
    missingKeywords,
    suggestions,
    naturalReply: score >= 82 ? originalReply : input.suggestedReply,
    originalReply
  };
}
