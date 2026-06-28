import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

export type RoleplayGoalTrackerOptions = {
  targetScore?: number;
};

export type RoleplayGoalTracker = {
  scenarioTitle: string;
  targetScore: number;
  attempts: number;
  latestScore: number;
  currentBest: number;
  averageScore: number;
  achieved: boolean;
  progressPercent: number;
  remainingPoints: number;
  streak: number;
  lastPracticedAt?: string;
  nextGoalLabel: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getScenarioAttempts(attempts: PracticeAttemptRecord[], scenarioTitle: string) {
  return attempts
    .filter(
      (attempt) =>
        attempt.type === "roleplay" &&
        attempt.prompt === scenarioTitle &&
        typeof attempt.score === "number"
    )
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function countLatestStreak(attempts: PracticeAttemptRecord[], targetScore: number) {
  let streak = 0;

  for (const attempt of attempts) {
    if ((attempt.score ?? 0) < targetScore) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function createNextGoalLabel(input: {
  attempts: number;
  achieved: boolean;
  latestScore: number;
  remainingPoints: number;
  streak: number;
  targetScore: number;
}) {
  if (input.attempts === 0) {
    return `完成一次完整角色扮演，目标 ${input.targetScore}%。`;
  }

  if (input.achieved && input.streak >= 3) {
    return "已经连续达标，下一步增加 AI 开放追问或迁移到新场景。";
  }

  if (input.achieved) {
    return "本场景已经达标，下一轮继续保持完整句和礼貌表达。";
  }

  return `距离目标还差 ${input.remainingPoints} 分，下一轮先补齐关键信息。`;
}

export function trackRoleplayGoal(
  attempts: PracticeAttemptRecord[],
  scenarioTitle: string,
  options: RoleplayGoalTrackerOptions = {}
): RoleplayGoalTracker {
  const targetScore = clampPercent(options.targetScore ?? 82);
  const scenarioAttempts = getScenarioAttempts(attempts, scenarioTitle);
  const scores = scenarioAttempts.map((attempt) => attempt.score ?? 0);
  const latestScore = scores[0] ?? 0;
  const currentBest = scores.length > 0 ? Math.max(...scores) : 0;
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const achieved = currentBest >= targetScore;
  const progressPercent = targetScore > 0 ? clampPercent((currentBest / targetScore) * 100) : 100;
  const remainingPoints = Math.max(0, targetScore - currentBest);
  const streak = countLatestStreak(scenarioAttempts, targetScore);

  return {
    scenarioTitle,
    targetScore,
    attempts: scenarioAttempts.length,
    latestScore,
    currentBest,
    averageScore,
    achieved,
    progressPercent,
    remainingPoints,
    streak,
    lastPracticedAt: scenarioAttempts[0]?.createdAt,
    nextGoalLabel: createNextGoalLabel({
      attempts: scenarioAttempts.length,
      achieved,
      latestScore,
      remainingPoints,
      streak,
      targetScore
    })
  };
}
