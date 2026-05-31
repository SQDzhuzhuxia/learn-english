import { describe, expect, it } from "vitest";
import { summarizeRoleplaySession } from "@/lib/speech/roleplay-session-summary";

describe("summarizeRoleplaySession", () => {
  it("summarizes a completed roleplay session", () => {
    const summary = summarizeRoleplaySession({
      scenarioTitle: "前台预约医生",
      goal: "完成预约需求、说明症状、确认下午 3 点是否可以。",
      totalTurns: 3,
      entries: [
        {
          partnerText: "Good morning. How can I help you?",
          learnerText: "I would like to make an appointment with a doctor.",
          score: 92,
          feedback: "表达已经比较完整。"
        },
        {
          partnerText: "What seems to be the problem?",
          learnerText: "I have had a sore throat since yesterday.",
          score: 88,
          feedback: "关键信息完整。"
        },
        {
          partnerText: "Does 3 p.m. work for you?",
          learnerText: "Yes, that works for me. Thank you.",
          score: 86,
          feedback: "表达自然。"
        }
      ]
    });

    expect(summary.completedTurns).toBe(3);
    expect(summary.totalTurns).toBe(3);
    expect(summary.averageScore).toBe(89);
    expect(summary.completionRate).toBe(100);
    expect(summary.levelLabel).toBe("可以真实使用");
    expect(summary.summaryZh).toContain("已完成 3/3 轮");
    expect(summary.strengths).toContain("完成了从开场到确认的完整场景流程。");
    expect(summary.nextPractice).toContain("点击 AI 继续追问，增加 1 轮开放对话。");
  });

  it("points out focus areas for an incomplete low-score session", () => {
    const summary = summarizeRoleplaySession({
      scenarioTitle: "前台预约医生",
      goal: "完成预约需求、说明症状、确认下午 3 点是否可以。",
      totalTurns: 3,
      entries: [
        {
          partnerText: "Good morning. How can I help you?",
          learnerText: "doctor",
          score: 35,
          feedback: "先用完整句。"
        }
      ]
    });

    expect(summary.completedTurns).toBe(1);
    expect(summary.averageScore).toBe(35);
    expect(summary.completionRate).toBe(33);
    expect(summary.levelLabel).toBe("需要支架");
    expect(summary.focusAreas).toContain("继续完成剩余 2 轮对话。");
    expect(summary.focusAreas).toContain("低分轮次需要补齐关键信息，不要只回答 yes/no。");
    expect(summary.nextPractice).toContain("先完成当前固定脚本，再进入 AI 开放追问。");
  });
});
