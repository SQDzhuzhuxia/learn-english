import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import { createTodayCoursePlan } from "@/lib/content/today-plan";

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
