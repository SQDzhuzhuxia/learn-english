import { summarizeOutputErrors, type OutputErrorCategory, type OutputErrorSummary } from "@/lib/analytics/output-error-stats";
import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

export type OutputWeaknessRiskLevel = "none" | "low" | "medium" | "high";

export type OutputTrainingPlanItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: "P0" | "P1" | "P2";
};

export type OutputWeaknessProfile = {
  attemptCount: number;
  scoredAttemptCount: number;
  averageScore: number;
  levelLabel: "暂无画像" | "需要支架" | "建立中" | "稳定输出" | "迁移提高";
  riskLevel: OutputWeaknessRiskLevel;
  primaryFocus?: OutputErrorCategory;
  strengths: string[];
  blockers: string[];
  nextTrainingPlan: OutputTrainingPlanItem[];
  weeklyTarget: string;
};

const TRAINING_PLAN_BY_CATEGORY: Record<OutputErrorCategory["id"], Omit<OutputTrainingPlanItem, "id" | "priority">> = {
  pronunciation: {
    title: "慢速跟读短句",
    detail: "选择 1 个关键句，先听 2 遍，再录音 1 遍，对照漏词和重点发音。",
    href: "/practice#practice-shadowing"
  },
  fluency: {
    title: "三遍复述同一内容",
    detail: "同一段材料连续复述 3 遍，目标是减少停顿，不急着换内容。",
    href: "/practice#practice-retelling"
  },
  "key-information": {
    title: "角色任务补全",
    detail: "按中文目标补齐时间、地点、请求和确认信息，再提交角色回答。",
    href: "/practice#practice-roleplay"
  },
  "sentence-completeness": {
    title: "完整句模板练习",
    detail: "用 I would like to... / I have... / It works for me. 把短回答扩成完整句。",
    href: "/practice#practice-roleplay"
  },
  "grammar-naturalness": {
    title: "AI 修正版对照",
    detail: "写一句真实场景英文，保存 AI 修正版，并复习原句和自然说法差异。",
    href: "/practice#practice-writing"
  },
  vocabulary: {
    title: "高频词块沉淀",
    detail: "从当前材料保存 3 个可直接开口的词块，再用它们造句。",
    href: "/notebook"
  },
  politeness: {
    title: "礼貌表达套用",
    detail: "每轮服务场景回答都加入 please、could、would like 或 thank you。",
    href: "/practice#practice-roleplay"
  }
};

function getRiskLevel(summary: OutputErrorSummary): OutputWeaknessRiskLevel {
  const topSeverity = summary.categories[0]?.severity ?? 0;

  if (summary.attemptCount === 0) {
    return "none";
  }

  if (summary.averageScore < 60 || topSeverity >= 80) {
    return "high";
  }

  if (summary.averageScore < 75 || topSeverity >= 50) {
    return "medium";
  }

  return "low";
}

function getLevelLabel(summary: OutputErrorSummary, riskLevel: OutputWeaknessRiskLevel): OutputWeaknessProfile["levelLabel"] {
  if (summary.attemptCount === 0) {
    return "暂无画像";
  }

  if (riskLevel === "high") {
    return "需要支架";
  }

  if (summary.averageScore >= 84 && summary.scoredAttemptCount >= 5) {
    return "迁移提高";
  }

  if (summary.averageScore >= 78) {
    return "稳定输出";
  }

  return "建立中";
}

function buildStrengths(summary: OutputErrorSummary): string[] {
  const strengths: string[] = [];
  const categoryIds = new Set(summary.categories.map((category) => category.id));

  if (summary.attemptCount === 0) {
    return ["先完成一次跟读、复述、写作或角色练习，系统才会生成真实画像。"];
  }

  if (summary.scoredAttemptCount >= 3) {
    strengths.push("已经有多次可评分输出记录，画像开始稳定。");
  }

  if (summary.averageScore >= 78) {
    strengths.push("平均完成度已经接近真实可用区间。");
  }

  if (!categoryIds.has("sentence-completeness")) {
    strengths.push("近期输出没有明显单词式短回答问题。");
  }

  if (!categoryIds.has("politeness")) {
    strengths.push("礼貌表达没有成为当前主要阻碍。");
  }

  return strengths.length > 0 ? strengths.slice(0, 3) : ["已经开始留下真实输出记录，下一步要提高稳定度。"];
}

function buildBlockers(summary: OutputErrorSummary): string[] {
  if (summary.attemptCount === 0) {
    return ["缺少真实输出记录。"];
  }

  return summary.categories.slice(0, 3).map((category) => `${category.label}：${category.action}`);
}

function buildTrainingPlan(summary: OutputErrorSummary): OutputTrainingPlanItem[] {
  if (summary.categories.length === 0) {
    return [
      {
        id: "baseline-shadowing",
        title: "建立第一条输出记录",
        detail: "先完成一次当前材料跟读，生成转写和完成度反馈。",
        href: "/practice#practice-shadowing",
        priority: "P0"
      }
    ];
  }

  return summary.categories.slice(0, 3).map((category, index) => ({
    id: `train-${category.id}`,
    ...TRAINING_PLAN_BY_CATEGORY[category.id],
    priority: index === 0 ? "P0" : index === 1 ? "P1" : "P2"
  }));
}

function buildWeeklyTarget(summary: OutputErrorSummary, riskLevel: OutputWeaknessRiskLevel) {
  if (summary.attemptCount === 0) {
    return "本周先完成 3 次输出：1 次跟读、1 次复述、1 次角色扮演。";
  }

  if (riskLevel === "high") {
    return "本周只攻 1 个主弱项，至少完成 5 次短练习，把平均完成度拉到 70%。";
  }

  if (riskLevel === "medium") {
    return "本周围绕前 2 个弱项各做 3 次短练习，把平均完成度稳定到 78%。";
  }

  return "本周增加开放追问和跨场景迁移，保持 80% 以上完成度。";
}

export function createOutputWeaknessProfile(attempts: PracticeAttemptRecord[]): OutputWeaknessProfile {
  const summary = summarizeOutputErrors(attempts);
  const riskLevel = getRiskLevel(summary);

  return {
    attemptCount: summary.attemptCount,
    scoredAttemptCount: summary.scoredAttemptCount,
    averageScore: summary.averageScore,
    levelLabel: getLevelLabel(summary, riskLevel),
    riskLevel,
    primaryFocus: summary.categories[0],
    strengths: buildStrengths(summary),
    blockers: buildBlockers(summary),
    nextTrainingPlan: buildTrainingPlan(summary),
    weeklyTarget: buildWeeklyTarget(summary, riskLevel)
  };
}
