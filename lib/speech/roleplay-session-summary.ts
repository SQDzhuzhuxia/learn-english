export type RoleplaySessionSummaryInput = {
  scenarioTitle: string;
  goal: string;
  totalTurns: number;
  entries: Array<{
    partnerText: string;
    learnerText: string;
    score: number;
    feedback: string;
  }>;
};

export type RoleplaySessionSummary = {
  completedTurns: number;
  totalTurns: number;
  averageScore: number;
  completionRate: number;
  levelLabel: string;
  summaryZh: string;
  strengths: string[];
  focusAreas: string[];
  nextPractice: string[];
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPoliteSignal(text: string) {
  const normalizedText = normalizeText(text);

  return ["please", "would like", "could", "can i", "thank"].some((signal) => normalizedText.includes(signal));
}

function pushUnique(items: string[], item: string) {
  if (!items.includes(item)) {
    items.push(item);
  }
}

function getLevelLabel(averageScore: number, completionRate: number) {
  if (averageScore >= 82 && completionRate >= 100) {
    return "可以真实使用";
  }

  if (averageScore >= 62) {
    return "基本能沟通";
  }

  return "需要支架";
}

export function summarizeRoleplaySession(input: RoleplaySessionSummaryInput): RoleplaySessionSummary {
  const safeTotalTurns = Math.max(input.totalTurns, 1);
  const completedTurns = Math.min(input.entries.length, safeTotalTurns);
  const averageScore =
    input.entries.length > 0
      ? Math.round(input.entries.reduce((sum, entry) => sum + entry.score, 0) / input.entries.length)
      : 0;
  const completionRate = Math.round((completedTurns / safeTotalTurns) * 100);
  const levelLabel = getLevelLabel(averageScore, completionRate);
  const answerWordCounts = input.entries.map((entry) => normalizeText(entry.learnerText).split(/\s+/).filter(Boolean).length);
  const hasLongAnswer = answerWordCounts.some((count) => count >= 8);
  const hasVeryShortAnswer = answerWordCounts.some((count) => count > 0 && count < 5);
  const hasPoliteAnswer = input.entries.some((entry) => hasPoliteSignal(entry.learnerText));
  const lowScoreCount = input.entries.filter((entry) => entry.score < 62).length;
  const strengths: string[] = [];
  const focusAreas: string[] = [];
  const nextPractice: string[] = [];

  if (completedTurns > 0) {
    pushUnique(strengths, "已经开始用英文回应真实生活场景。");
  }

  if (completionRate >= 100) {
    pushUnique(strengths, "完成了从开场到确认的完整场景流程。");
  }

  if (averageScore >= 80) {
    pushUnique(strengths, "多数回答已经能带出关键信息。");
  }

  if (hasLongAnswer) {
    pushUnique(strengths, "能说出较完整的英文句子，而不只是单词。");
  }

  if (hasPoliteAnswer) {
    pushUnique(strengths, "开始使用 please、would like、thank 等服务场景礼貌表达。");
  }

  if (strengths.length === 0) {
    pushUnique(strengths, "可以先照着推荐句回答，把基础句型练熟。");
  }

  if (completedTurns < safeTotalTurns) {
    pushUnique(focusAreas, `继续完成剩余 ${safeTotalTurns - completedTurns} 轮对话。`);
  }

  if (lowScoreCount > 0) {
    pushUnique(focusAreas, "低分轮次需要补齐关键信息，不要只回答 yes/no。");
  }

  if (hasVeryShortAnswer) {
    pushUnique(focusAreas, "把短回答扩展成完整句，至少包含主语、动作和核心信息。");
  }

  if (!hasPoliteAnswer && completedTurns > 0) {
    pushUnique(focusAreas, "生活服务场景里要主动加入礼貌表达，让语气更自然。");
  }

  if (averageScore < 70 && completedTurns > 0) {
    pushUnique(focusAreas, "先用推荐句建立稳定表达，再逐步换成自己的说法。");
  }

  if (focusAreas.length === 0) {
    pushUnique(focusAreas, "下一步重点练速度、停顿和自然语气。");
  }

  const targetScore = Math.min(95, Math.max(70, averageScore + 8));
  pushUnique(nextPractice, `再练一遍「${input.scenarioTitle}」，目标平均完成度达到 ${targetScore}%。`);
  pushUnique(nextPractice, "保存 1-2 句最能真实使用的回答，放进复习系统。");

  if (completionRate >= 100) {
    pushUnique(nextPractice, "点击 AI 继续追问，增加 1 轮开放对话。");
  } else {
    pushUnique(nextPractice, "先完成当前固定脚本，再进入 AI 开放追问。");
  }

  const summaryZh =
    completedTurns === 0
      ? `本轮目标是：${input.goal}`
      : completionRate >= 100
        ? `已完成 ${completedTurns}/${safeTotalTurns} 轮，平均完成度 ${averageScore}%，当前水平：${levelLabel}。`
        : `已完成 ${completedTurns}/${safeTotalTurns} 轮，当前平均完成度 ${averageScore}%，继续补完整个场景。`;

  return {
    completedTurns,
    totalTurns: safeTotalTurns,
    averageScore,
    completionRate,
    levelLabel,
    summaryZh,
    strengths: strengths.slice(0, 4),
    focusAreas: focusAreas.slice(0, 4),
    nextPractice: nextPractice.slice(0, 3)
  };
}
