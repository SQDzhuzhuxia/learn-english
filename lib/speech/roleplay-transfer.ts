import type { RoleplayMemory } from "@/lib/speech/roleplay-memory";

export type RoleplayTransferTarget = {
  id: string;
  title: string;
  setting: string;
  goalZh: string;
  transferTask: string;
  suggestedOpening: string;
  successCriteria: string[];
  lockedReason?: string;
};

export type RoleplayTransferPlan = {
  sourceScenarioTitle: string;
  readinessLabel: string;
  readinessScore: number;
  shouldTransfer: boolean;
  principle: string;
  carryOverSkills: string[];
  targets: RoleplayTransferTarget[];
};

const DEFAULT_TARGETS: RoleplayTransferTarget[] = [
  {
    id: "apartment-tour",
    title: "租房看房预约",
    setting: "美国公寓租赁办公室",
    goalZh: "预约看房，说明你想找下个月可入住的一居室，并确认周六上午是否可以。",
    transferTask: "把 make an appointment 迁移成 schedule a tour。",
    suggestedOpening: "I would like to schedule a tour for a one-bedroom apartment.",
    successCriteria: ["提出预约请求", "说明房型或入住时间", "确认具体时间"]
  },
  {
    id: "job-interview-time",
    title: "面试时间确认",
    setting: "招聘人员电话或邮件沟通",
    goalZh: "确认面试时间，表达这个时间可以，并礼貌感谢。",
    transferTask: "把 Does 3 p.m. work for you? 迁移成 interview time confirmation。",
    suggestedOpening: "Yes, that time works for me. Thank you for arranging the interview.",
    successCriteria: ["确认时间", "表达可以参加", "礼貌感谢"]
  },
  {
    id: "automation-support",
    title: "自动化设备问题沟通",
    setting: "工厂或办公室技术支持对话",
    goalZh: "说明设备报警，询问是否可以安排检查，并确认下一步。",
    transferTask: "把说明症状迁移成说明设备问题。",
    suggestedOpening: "The machine has shown an alarm since this morning. Could we schedule a check?",
    successCriteria: ["说明问题", "提出检查请求", "确认下一步"]
  }
];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getReadiness(memory: RoleplayMemory) {
  const readinessScore = clampScore(Math.max(memory.latestScore, Math.round((memory.averageScore + memory.bestScore) / 2)));

  if (memory.sessionCount === 0) {
    return {
      readinessScore,
      shouldTransfer: false,
      readinessLabel: "先完成当前场景",
      principle: "先把当前固定脚本完整跑通，再迁移到新场景。"
    };
  }

  if (memory.bestScore >= 82 || readinessScore >= 78) {
    return {
      readinessScore,
      shouldTransfer: true,
      readinessLabel: "可以迁移",
      principle: "把“提出请求、说明情况、确认时间、礼貌收尾”迁移到新场景。"
    };
  }

  if (readinessScore >= 62) {
    return {
      readinessScore,
      shouldTransfer: false,
      readinessLabel: "先小步迁移",
      principle: "先迁移一个句型，不要一次换完整场景。"
    };
  }

  return {
    readinessScore,
    shouldTransfer: false,
    readinessLabel: "先巩固",
    principle: "先用推荐回答把当前场景平均完成度提高到 70%。"
  };
}

function buildCarryOverSkills(memory: RoleplayMemory) {
  const skills = [
    "用 I would like to... 礼貌提出请求。",
    "用 I have... / since... 说明情况和时间线。",
    "用 Does ... work for you? / That works for me. 确认时间。",
    "用 Thank you for your help. 礼貌收尾。"
  ];

  if (memory.focusAreas.some((item) => item.includes("完整句"))) {
    skills.unshift("先把单词式回答扩展成完整句。");
  }

  if (memory.bestScore >= 82) {
    skills.push("在新场景里尝试少看推荐句，用自己的话完成同样结构。");
  }

  return skills.slice(0, 5);
}

export function createRoleplayTransferPlan(
  memory: RoleplayMemory,
  targets: RoleplayTransferTarget[] = DEFAULT_TARGETS
): RoleplayTransferPlan {
  const readiness = getReadiness(memory);
  const lockReason =
    memory.sessionCount === 0
      ? "先完成一次当前角色扮演。"
      : `先把当前场景平均完成度提高到 ${readiness.readinessScore >= 62 ? "78" : "70"}%。`;

  return {
    sourceScenarioTitle: memory.scenarioTitle,
    readinessLabel: readiness.readinessLabel,
    readinessScore: readiness.readinessScore,
    shouldTransfer: readiness.shouldTransfer,
    principle: readiness.principle,
    carryOverSkills: buildCarryOverSkills(memory),
    targets: targets.slice(0, readiness.shouldTransfer ? 3 : 1).map((target) => ({
      ...target,
      lockedReason: readiness.shouldTransfer ? undefined : lockReason
    }))
  };
}
