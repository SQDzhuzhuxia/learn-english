import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import {
  createDailyStudySessionPlan,
  createTodayCoursePlan,
  createTodaySmartRecommendation
} from "@/lib/content/today-plan";
import type { OutputErrorSummary } from "@/lib/analytics/output-error-stats";

describe("createTodayCoursePlan", () => {
  it("selects the first unfinished material from the first active course track", () => {
    const materials = getSeedMaterials();
    const plan = createTodayCoursePlan(materials);

    expect(plan.activeTrack?.id).toBe("survival-foundation");
    expect(plan.currentMaterial?.id).toBe("doctor-visit");
    expect(plan.trackProgress).toBe(0);
  });

  it("moves to the next material when the current one is completed", () => {
    const materials = getSeedMaterials().map((material) =>
      material.id === "doctor-visit"
        ? {
            ...material,
            status: "已完成" as const,
            progress: 100
          }
        : material
    );
    const plan = createTodayCoursePlan(materials);

    expect(plan.currentMaterial?.id).toBe("grocery-store");
    expect(plan.trackProgress).toBeGreaterThan(0);
  });
});

describe("createDailyStudySessionPlan", () => {
  it("creates a 30 minute beginner input loop", () => {
    const material = getSeedMaterials()[0];
    const plan = createDailyStudySessionPlan({
      duration: 30,
      currentMaterial: material,
      dueReviewCount: 6
    });

    expect(plan.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(30);
    expect(plan.inputMinutes).toBe(20);
    expect(plan.outputMinutes).toBe(6);
    expect(plan.inputRatio).toBe(67);
    expect(plan.steps[0]?.title).toBe("复习唤醒");
    expect(plan.steps[1]?.description).toContain(material.title);
  });

  it("supports longer 45 and 60 minute sessions", () => {
    const fortyFive = createDailyStudySessionPlan({
      duration: 45,
      dueReviewCount: 0
    });
    const sixty = createDailyStudySessionPlan({
      duration: 60,
      dueReviewCount: 0
    });

    expect(fortyFive.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(45);
    expect(sixty.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(60);
    expect(sixty.inputMinutes).toBeGreaterThan(fortyFive.inputMinutes);
    expect(fortyFive.steps[0]?.title).toBe("听前热身");
  });
});

describe("createTodaySmartRecommendation", () => {
  function createBaseInput() {
    const coursePlan = createTodayCoursePlan(getSeedMaterials());
    const sessionPlan = createDailyStudySessionPlan({
      duration: 30,
      currentMaterial: coursePlan.currentMaterial,
      dueReviewCount: 0
    });

    return {
      coursePlan,
      sessionPlan
    };
  }

  it("prioritizes review when many cards are due", () => {
    const input = createBaseInput();
    const recommendation = createTodaySmartRecommendation({
      ...input,
      dueReviewCount: 12
    });

    expect(recommendation.priority).toBe("review");
    expect(recommendation.href).toBe("/review");
    expect(recommendation.detail).toContain("12");
  });

  it("routes severe pronunciation weakness to shadowing practice", () => {
    const input = createBaseInput();
    const outputErrorSummary: OutputErrorSummary = {
      attemptCount: 1,
      scoredAttemptCount: 1,
      averageScore: 62,
      categories: [
        {
          id: "pronunciation",
          label: "发音和听辨",
          detail: "跟读里出现漏词、误识别或重点词不稳定。",
          action: "先慢速跟读短句。",
          count: 1,
          severity: 72,
          examples: []
        }
      ]
    };
    const recommendation = createTodaySmartRecommendation({
      ...input,
      outputErrorSummary,
      dueReviewCount: 0
    });

    expect(recommendation.priority).toBe("pronunciation");
    expect(recommendation.href).toBe("/practice#practice-shadowing");
    expect(recommendation.reason).toContain("发音和听辨");
  });

  it("falls back to input when weekly input is below the daily plan", () => {
    const input = createBaseInput();
    const recommendation = createTodaySmartRecommendation({
      ...input,
      activitySummary: {
        inputMinutes: 0,
        outputMinutes: 0,
        reviewMinutes: 0
      },
      dueReviewCount: 0
    });

    expect(recommendation.priority).toBe("input");
    expect(recommendation.href).toBe(`/study/${input.coursePlan.currentMaterial?.id}`);
    expect(recommendation.detail).toContain("20 分钟");
  });

  it("recommends output when input is already enough", () => {
    const input = createBaseInput();
    const recommendation = createTodaySmartRecommendation({
      ...input,
      activitySummary: {
        inputMinutes: 60,
        outputMinutes: 0,
        reviewMinutes: 0
      },
      dueReviewCount: 0
    });

    expect(recommendation.priority).toBe("output");
    expect(recommendation.href).toBe("/practice#practice-shadowing");
  });
});
