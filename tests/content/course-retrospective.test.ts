import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import { courseTracks, createCourseStageRetrospective } from "@/lib/content/course-catalog";

function findTrack(id: string) {
  const track = courseTracks.find((item) => item.id === id);

  if (!track) {
    throw new Error(`missing track ${id}`);
  }

  return track;
}

describe("createCourseStageRetrospective", () => {
  it("reports no completed stage when nothing is finished yet", () => {
    const track = findTrack("survival-foundation");
    const retrospective = createCourseStageRetrospective(track, getSeedMaterials());

    expect(retrospective.hasCompletedStage).toBe(false);
    expect(retrospective.trackCompleted).toBe(false);
    expect(retrospective.completedStageTitles).toHaveLength(0);
    expect(retrospective.currentStage?.id).toBe("survival-medical-shopping");
    expect(retrospective.advice.length).toBeGreaterThan(0);
    expect(retrospective.nextActionLabel.length).toBeGreaterThan(0);
  });

  it("summarizes a finished stage and points to the next stage", () => {
    const track = findTrack("survival-foundation");
    const firstStageIds = new Set(track.stages[0].materialIds);
    const materials = getSeedMaterials().map((material) =>
      firstStageIds.has(material.id)
        ? { ...material, status: "已完成" as const, progress: 100 }
        : material
    );

    const retrospective = createCourseStageRetrospective(track, materials);

    expect(retrospective.hasCompletedStage).toBe(true);
    expect(retrospective.trackCompleted).toBe(false);
    expect(retrospective.completedStageTitles).toContain(track.stages[0].title);
    expect(retrospective.coveredMaterials.length).toBeGreaterThanOrEqual(firstStageIds.size);
    expect(retrospective.currentStage?.id).toBe("survival-services-transit");
    expect(retrospective.nextStage?.id).toBe("survival-services-transit");
    expect(retrospective.nextMaterialId).toBe(retrospective.currentStage?.nextMaterial?.id);
  });

  it("marks the whole track complete when all stages are finished", () => {
    const track = findTrack("survival-foundation");
    const trackIds = new Set(track.materialIds);
    const materials = getSeedMaterials().map((material) =>
      trackIds.has(material.id)
        ? { ...material, status: "已完成" as const, progress: 100 }
        : material
    );

    const retrospective = createCourseStageRetrospective(track, materials);

    expect(retrospective.trackCompleted).toBe(true);
    expect(retrospective.hasCompletedStage).toBe(true);
    expect(retrospective.nextStage).toBeUndefined();
    expect(retrospective.advice).toContain("完成");
  });
});
