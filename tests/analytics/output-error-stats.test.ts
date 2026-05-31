import { describe, expect, it } from "vitest";
import { summarizeOutputErrors } from "@/lib/analytics/output-error-stats";
import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";

function createAttempt(input: Partial<PracticeAttemptRecord> & Pick<PracticeAttemptRecord, "type">): PracticeAttemptRecord {
  return {
    id: input.id ?? "attempt-1",
    type: input.type,
    prompt: input.prompt ?? "Practice prompt",
    materialTitle: input.materialTitle ?? "A Visit to the Doctor",
    durationSeconds: input.durationSeconds ?? 30,
    transcript: input.transcript,
    transcriptSource: input.transcriptSource,
    score: input.score,
    feedback: input.feedback,
    status: input.status ?? "transcribed",
    createdAt: input.createdAt ?? "2026-05-31T09:00:00.000Z"
  };
}

describe("summarizeOutputErrors", () => {
  it("detects pronunciation issues from shadowing feedback", () => {
    const summary = summarizeOutputErrors([
      createAttempt({
        type: "shadowing",
        score: 58,
        feedback: "漏掉：appointment。多出/误识别：doctor。",
        transcript: "I would like doctor"
      })
    ]);

    expect(summary.attemptCount).toBe(1);
    expect(summary.averageScore).toBe(58);
    expect(summary.categories[0]?.id).toBe("pronunciation");
  });

  it("detects incomplete roleplay replies and missing key information", () => {
    const summary = summarizeOutputErrors([
      createAttempt({
        type: "roleplay",
        prompt: "前台预约医生",
        score: 35,
        feedback: "低分轮次需要补齐关键信息，不要只回答 yes/no。",
        transcript: "doctor"
      })
    ]);
    const ids = summary.categories.map((category) => category.id);

    expect(ids).toContain("key-information");
    expect(ids).toContain("sentence-completeness");
    expect(ids).toContain("vocabulary");
  });

  it("detects grammar and naturalness issues from writing attempts", () => {
    const summary = summarizeOutputErrors([
      createAttempt({
        type: "writing",
        score: 68,
        feedback: "语法和自然度需要调整，表达有点中式。",
        transcript: "I want see doctor tomorrow"
      })
    ]);
    const grammar = summary.categories.find((category) => category.id === "grammar-naturalness");

    expect(grammar?.label).toBe("语法和自然度");
    expect(grammar?.count).toBe(1);
    expect(summary.scoredAttemptCount).toBe(1);
  });
});
