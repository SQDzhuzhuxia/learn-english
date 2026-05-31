import { describe, expect, it } from "vitest";
import { summarizeRoleplayMemory } from "@/lib/speech/roleplay-memory";
import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

function createRoleplayAttempt(input: Partial<PracticeAttemptRecord>): PracticeAttemptRecord {
  return {
    id: input.id ?? "attempt-1",
    type: "roleplay",
    prompt: input.prompt ?? "前台预约医生",
    materialTitle: input.materialTitle ?? "A Visit to the Doctor",
    durationSeconds: input.durationSeconds ?? 120,
    transcript: input.transcript,
    score: input.score,
    feedback: input.feedback,
    status: input.status ?? "transcribed",
    createdAt: input.createdAt ?? "2026-05-31T10:00:00.000Z"
  };
}

describe("summarizeRoleplayMemory", () => {
  it("returns a first-session goal when there is no roleplay history", () => {
    const memory = summarizeRoleplayMemory([], "前台预约医生");

    expect(memory.sessionCount).toBe(0);
    expect(memory.averageScore).toBe(0);
    expect(memory.nextGoal).toBe("完成一次固定脚本，目标平均完成度 70%。");
    expect(memory.focusAreas).toContain("先完成固定三轮脚本，建立第一条历史记录。");
  });

  it("summarizes repeated roleplay practice and positive signals", () => {
    const memory = summarizeRoleplayMemory(
      [
        createRoleplayAttempt({
          id: "new",
          score: 86,
          transcript: "Front desk: How can I help you?\nMe: I would like to make an appointment, please.",
          createdAt: "2026-05-31T10:00:00.000Z"
        }),
        createRoleplayAttempt({
          id: "old",
          score: 74,
          transcript: "Front desk: How can I help you?\nMe: I need a doctor.",
          createdAt: "2026-05-30T10:00:00.000Z"
        })
      ],
      "前台预约医生"
    );

    expect(memory.sessionCount).toBe(2);
    expect(memory.averageScore).toBe(80);
    expect(memory.bestScore).toBe(86);
    expect(memory.latestScore).toBe(86);
    expect(memory.trendLabel).toBe("正在进步");
    expect(memory.masteredSignals).toContain("曾经达到可以真实使用的完成度。");
    expect(memory.masteredSignals).toContain("已经使用过 would like、please、thank 等礼貌表达。");
    expect(memory.nextGoal).toBe("下一次完成固定脚本后增加 1 轮 AI 开放追问。");
  });

  it("suggests complete sentences when history contains short replies", () => {
    const memory = summarizeRoleplayMemory(
      [
        createRoleplayAttempt({
          score: 45,
          transcript: "Front desk: What seems to be the problem?\nMe: throat",
          feedback: "需要支架。",
          createdAt: "2026-05-31T10:00:00.000Z"
        })
      ],
      "前台预约医生"
    );

    expect(memory.focusAreas).toContain("把单词式回答扩展成完整句。");
    expect(memory.nextGoal).toBe("下一次把平均完成度提高到 70%。");
  });
});
