export type RetellingFeedback = {
  score: number;
  label: string;
  tip: string;
  coveredPoints: string[];
  missingPoints: string[];
  usefulWordsUsed: string[];
  suggestions: string[];
};

function normalizeWords(text: string) {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter(Boolean);
}

function includesAnyWord(spokenWords: string[], candidates: string[]) {
  const wordSet = new Set(spokenWords);
  return candidates.some((candidate) => wordSet.has(candidate.toLowerCase()));
}

function createSuggestions(input: {
  missingPoints: string[];
  usefulWordsUsed: string[];
  spokenWordCount: number;
}) {
  const suggestions: string[] = [];

  if (input.spokenWordCount < 8) {
    suggestions.push("先用 1-2 个完整英文句子复述，不要只写关键词。");
  }

  if (input.missingPoints.length > 0) {
    suggestions.push(`下一遍补上：${input.missingPoints.slice(0, 2).join("、")}。`);
  }

  if (input.usefulWordsUsed.length === 0) {
    suggestions.push("尝试用上材料里的关键词，比如 appointment, doctor, afternoon。");
  }

  if (suggestions.length === 0) {
    suggestions.push("大意已经能讲出来，下一步把句子连得更自然。");
  }

  return suggestions;
}

export function createRetellingFeedback(input: {
  transcript: string;
  keyPoints: Array<{
    label: string;
    keywords: string[];
  }>;
  usefulWords: string[];
}): RetellingFeedback {
  const spokenWords = normalizeWords(input.transcript);
  const coveredPoints = input.keyPoints
    .filter((point) => includesAnyWord(spokenWords, point.keywords))
    .map((point) => point.label);
  const missingPoints = input.keyPoints
    .filter((point) => !coveredPoints.includes(point.label))
    .map((point) => point.label);
  const usefulWordsUsed = input.usefulWords.filter((word) =>
    spokenWords.includes(word.toLowerCase())
  );
  const coverageScore = Math.round((coveredPoints.length / Math.max(1, input.keyPoints.length)) * 75);
  const lengthScore = spokenWords.length >= 16 ? 15 : spokenWords.length >= 8 ? 10 : 3;
  const usefulWordScore = Math.min(10, usefulWordsUsed.length * 3);
  const score = Math.max(0, Math.min(100, coverageScore + lengthScore + usefulWordScore));
  const suggestions = createSuggestions({
    missingPoints,
    usefulWordsUsed,
    spokenWordCount: spokenWords.length
  });

  if (score >= 85) {
    return {
      score,
      label: "复述清楚",
      tip: "你已经把主要意思讲出来了，可以继续练更自然的连接词和细节。",
      coveredPoints,
      missingPoints,
      usefulWordsUsed,
      suggestions
    };
  }

  if (score >= 60) {
    return {
      score,
      label: "大意基本到位",
      tip: "主要信息已经有了，下一遍补齐缺失点，让句子更完整。",
      coveredPoints,
      missingPoints,
      usefulWordsUsed,
      suggestions
    };
  }

  return {
    score,
    label: "需要更多支架",
    tip: "先看提示句，用最简单的主谓宾把大意说完整。",
    coveredPoints,
    missingPoints,
    usefulWordsUsed,
    suggestions
  };
}
