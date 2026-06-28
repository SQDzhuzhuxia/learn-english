import { describe, expect, it } from "vitest";
import { createOutputWeaknessProfile } from "@/lib/analytics/output-weakness-profile";
import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

function attempt(input: Partial<PracticeAttemptRecord> & Pick<PracticeAttemptRecord, "type">): PracticeAttemptRecord {
  return {
    id: input.id ?? "attempt-1",
    type: input.type,
    prompt: input.prompt ?? "Practice prompt",
    materialTitle: input.materialTitle ?? "A Visit to the Doctor",
    durationSeconds: input.durationSeconds ?? 60,
    transcript: input.transcript,
    transcriptSource: input.transcriptSource,
    score: input.score,
    feedback: input.feedback,
    status: input.status ?? "reviewed",
    createdAt: input.createdAt ?? "2026-06-20T09:00:00.000Z"
  };
}

describe("createOutputWeaknessProfile", () => {
  it("returns an empty profile before any output history exists", () => {
    const profile = createOutputWeaknessProfile([]);

    expect(profile.levelLabel).toBe("暂无画像");
    expect(profile.riskLevel).toBe("none");
    expect(profile.primaryFocus).toBeUndefined();
    expect(profile.nextTrainingPlan[0]?.href).toBe("/practice#practice-shadowing");
    expect(profile.weeklyTarget).toContain("3 次输出");
  });

  it("builds a high-risk profile from severe roleplay and shadowing issues", () => {
    const profile = createOutputWeaknessProfile([
      attempt({
        type: "shadowing",
        score: 52,
        transcript: "I want doctor",
        feedback: "漏掉 appointment，重点词不稳定。"
      }),
      attempt({
        type: "roleplay",
        score: 38,
        transcript: "doctor",
        feedback: "低分轮次需要补齐关键信息，不要只回答 yes/no。"
      })
    ]);

    expect(profile.levelLabel).toBe("需要支架");
    expect(profile.riskLevel).toBe("high");
    expect(profile.primaryFocus).toBeDefined();
    expect(profile.blockers.length).toBeGreaterThan(0);
    expect(profile.nextTrainingPlan[0]?.priority).toBe("P0");
    expect(profile.weeklyTarget).toContain("主弱项");
  });

  it("recognizes a stable output profile when scores are high", () => {
    const profile = createOutputWeaknessProfile([
      attempt({ id: "a1", type: "retelling", score: 82, transcript: "I would like to explain the main idea clearly." }),
      attempt({ id: "a2", type: "writing", score: 84, transcript: "I would like to make an appointment tomorrow." }),
      attempt({ id: "a3", type: "roleplay", score: 86, transcript: "Me: I would like to make an appointment, please." })
    ]);

    expect(profile.riskLevel).toBe("low");
    expect(profile.levelLabel).toBe("稳定输出");
    expect(profile.strengths).toContain("平均完成度已经接近真实可用区间。");
    expect(profile.weeklyTarget).toContain("开放追问");
  });
});
