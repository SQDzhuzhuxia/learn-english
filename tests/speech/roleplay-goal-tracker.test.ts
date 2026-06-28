import { describe, expect, it } from "vitest";
import type { PracticeAttemptRecord } from "@/lib/speech/practice-store";
import { trackRoleplayGoal } from "@/lib/speech/roleplay-goal-tracker";

const SCENARIO = "前台预约医生";

function attempt(score: number, daysAgo: number, transcript = ""): PracticeAttemptRecord {
  const createdAt = new Date(Date.UTC(2026, 5, 20 - daysAgo)).toISOString();

  return {
    id: `a-${daysAgo}-${score}`,
    type: "roleplay",
    prompt: SCENARIO,
    materialTitle: SCENARIO,
    durationSeconds: 60,
    transcript,
    score,
    status: "reviewed",
    createdAt
  };
}

describe("trackRoleplayGoal", () => {
  it("returns an empty-state tracker when there is no history", () => {
    const tracker = trackRoleplayGoal([], SCENARIO);

    expect(tracker.attempts).toBe(0);
    expect(tracker.achieved).toBe(false);
    expect(tracker.progressPercent).toBe(0);
    expect(tracker.remainingPoints).toBe(tracker.targetScore);
    expect(tracker.nextGoalLabel.length).toBeGreaterThan(0);
  });

  it("reports partial progress when below the target", () => {
    const tracker = trackRoleplayGoal([attempt(60, 1), attempt(66, 0)], SCENARIO, { targetScore: 82 });

    expect(tracker.attempts).toBe(2);
    expect(tracker.currentBest).toBe(66);
    expect(tracker.latestScore).toBe(66);
    expect(tracker.achieved).toBe(false);
    expect(tracker.remainingPoints).toBe(16);
    expect(tracker.progressPercent).toBeGreaterThan(0);
    expect(tracker.progressPercent).toBeLessThan(100);
  });

  it("marks the goal achieved and counts the streak from the latest session", () => {
    const tracker = trackRoleplayGoal(
      [attempt(70, 3), attempt(84, 2), attempt(88, 1), attempt(90, 0)],
      SCENARIO,
      { targetScore: 82 }
    );

    expect(tracker.achieved).toBe(true);
    expect(tracker.currentBest).toBe(90);
    expect(tracker.progressPercent).toBe(100);
    expect(tracker.remainingPoints).toBe(0);
    expect(tracker.streak).toBe(3);
  });

  it("ignores attempts from other scenarios", () => {
    const other: PracticeAttemptRecord = { ...attempt(95, 0), prompt: "另一个场景" };
    const tracker = trackRoleplayGoal([other, attempt(50, 1)], SCENARIO, { targetScore: 82 });

    expect(tracker.attempts).toBe(1);
    expect(tracker.currentBest).toBe(50);
  });
});
