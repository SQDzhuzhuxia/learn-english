import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import { createDailyStudySessionPlan, createTodayCoursePlan } from "@/lib/content/today-plan";

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
