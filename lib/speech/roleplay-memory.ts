import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

export type RoleplayMemory = {
  scenarioTitle: string;
  sessionCount: number;
  averageScore: number;
  bestScore: number;
  latestScore: number;
  lastPracticedAt?: string;
  trendLabel: string;
  masteredSignals: string[];
  focusAreas: string[];
  nextGoal: string;
};

function getScoredRoleplayAttempts(attempts: PracticeAttemptRecord[], scenarioTitle: string) {
  return attempts
    .filter((attempt) => attempt.type === "roleplay" && attempt.prompt === scenarioTitle && attempt.score !== undefined)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLearnerReplies(transcript?: string) {
  if (!transcript) {
    return [];
  }

  return transcript
    .split(/\r?\n/)
    .filter((line) => line.trim().toLowerCase().startsWith("me:"))
    .map((line) => line.replace(/^me:\s*/i, "").trim())
    .filter(Boolean);
}

function hasShortReply(attempt: PracticeAttemptRecord) {
  return getLearnerReplies(attempt.transcript).some((reply) => {
    const wordCount = normalizeText(reply).split(/\s+/).filter(Boolean).length;

    return wordCount > 0 && wordCount < 6;
  });
}

function hasPoliteExpression(attempts: PracticeAttemptRecord[]) {
  return attempts.some((attempt) => {
    const text = normalizeText(`${attempt.transcript ?? ""} ${attempt.feedback ?? ""}`);

    return ["please", "would like", "could", "thank"].some((signal) => text.includes(signal));
  });
}

function createTrendLabel(attempts: PracticeAttemptRecord[]) {
  if (attempts.length < 2) {
    return "刚开始积累";
  }

  const latest = attempts[0]?.score ?? 0;
  const previous = attempts[1]?.score ?? 0;

  if (latest >= previous + 5) {
    return "正在进步";
  }

  if (latest + 5 < previous) {
    return "需要回炉";
  }

  return "保持稳定";
}

export function summarizeRoleplayMemory(
  attempts: PracticeAttemptRecord[],
  scenarioTitle: string
): RoleplayMemory {
  const roleplayAttempts = getScoredRoleplayAttempts(attempts, scenarioTitle);
  const scores = roleplayAttempts.map((attempt) => attempt.score ?? 0);
  const latestScore = scores[0] ?? 0;
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const masteredSignals: string[] = [];
  const focusAreas: string[] = [];

  if (bestScore >= 82) {
    masteredSignals.push("曾经达到可以真实使用的完成度。");
  }

  if (roleplayAttempts.length >= 3) {
    masteredSignals.push("这个场景已经多次练习，开始形成长期记忆。");
  }

  if (hasPoliteExpression(roleplayAttempts)) {
    masteredSignals.push("已经使用过 would like、please、thank 等礼貌表达。");
  }

  if (masteredSignals.length === 0) {
    masteredSignals.push("还在建立第一批稳定表达。");
  }

  if (roleplayAttempts.length === 0) {
    focusAreas.push("先完成固定三轮脚本，建立第一条历史记录。");
  } else {
    if (averageScore < 70) {
      focusAreas.push("优先把推荐回答说完整，先追求可沟通。");
    }

    if (roleplayAttempts.some(hasShortReply)) {
      focusAreas.push("把单词式回答扩展成完整句。");
    }

    if (latestScore < 82) {
      focusAreas.push("下一轮补齐关键信息，并保留礼貌表达。");
    }
  }

  if (focusAreas.length === 0) {
    focusAreas.push("继续练开放追问，提高临场反应。");
  }

  const nextGoal =
    roleplayAttempts.length === 0
      ? "完成一次固定脚本，目标平均完成度 70%。"
      : latestScore >= 82
        ? "下一次完成固定脚本后增加 1 轮 AI 开放追问。"
        : `下一次把平均完成度提高到 ${Math.min(90, Math.max(70, latestScore + 8))}%。`;

  return {
    scenarioTitle,
    sessionCount: roleplayAttempts.length,
    averageScore,
    bestScore,
    latestScore,
    lastPracticedAt: roleplayAttempts[0]?.createdAt,
    trendLabel: createTrendLabel(roleplayAttempts),
    masteredSignals: masteredSignals.slice(0, 3),
    focusAreas: focusAreas.slice(0, 3),
    nextGoal
  };
}
