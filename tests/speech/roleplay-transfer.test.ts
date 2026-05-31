import { describe, expect, it } from "vitest";
import { createRoleplayTransferPlan } from "@/lib/speech/roleplay-transfer";
import type { RoleplayMemory } from "@/lib/speech/roleplay-memory";

function createMemory(input: Partial<RoleplayMemory> = {}): RoleplayMemory {
  return {
    scenarioTitle: "前台预约医生",
    sessionCount: 0,
    averageScore: 0,
    bestScore: 0,
    latestScore: 0,
    trendLabel: "刚开始积累",
    masteredSignals: ["还在建立第一批稳定表达。"],
    focusAreas: ["先完成固定三轮脚本，建立第一条历史记录。"],
    nextGoal: "完成一次固定脚本，目标平均完成度 70%。",
    ...input
  };
}

describe("createRoleplayTransferPlan", () => {
  it("locks transfer targets before the first roleplay session", () => {
    const plan = createRoleplayTransferPlan(createMemory());

    expect(plan.shouldTransfer).toBe(false);
    expect(plan.readinessLabel).toBe("先完成当前场景");
    expect(plan.targets).toHaveLength(1);
    expect(plan.targets[0]?.lockedReason).toBe("先完成一次当前角色扮演。");
  });

  it("unlocks multiple transfer targets when the current scenario is strong", () => {
    const plan = createRoleplayTransferPlan(
      createMemory({
        sessionCount: 3,
        averageScore: 83,
        bestScore: 90,
        latestScore: 86,
        trendLabel: "正在进步",
        masteredSignals: ["曾经达到可以真实使用的完成度。"],
        focusAreas: ["继续练开放追问，提高临场反应。"]
      })
    );

    expect(plan.shouldTransfer).toBe(true);
    expect(plan.readinessLabel).toBe("可以迁移");
    expect(plan.targets).toHaveLength(3);
    expect(plan.targets.every((target) => target.lockedReason === undefined)).toBe(true);
    expect(plan.carryOverSkills).toContain("在新场景里尝试少看推荐句，用自己的话完成同样结构。");
  });

  it("keeps only a small-step target for medium readiness", () => {
    const plan = createRoleplayTransferPlan(
      createMemory({
        sessionCount: 1,
        averageScore: 66,
        bestScore: 68,
        latestScore: 68,
        focusAreas: ["把单词式回答扩展成完整句。"]
      })
    );

    expect(plan.shouldTransfer).toBe(false);
    expect(plan.readinessLabel).toBe("先小步迁移");
    expect(plan.targets).toHaveLength(1);
    expect(plan.carryOverSkills[0]).toBe("先把单词式回答扩展成完整句。");
  });
});
