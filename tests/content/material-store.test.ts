import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTextMaterial,
  deleteUserMaterial,
  loadMaterials,
  updateTextMaterial
} from "@/lib/content/material-store";
import {
  loadLearningItems,
  loadReviewCards,
  saveSegmentAsReviewCard
} from "@/lib/review/review-store";
import { courseTracks, createCourseStageSummaries } from "@/lib/content/course-catalog";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  setupLocalStorage();
});

describe("material-store", () => {
  it("updates user-imported material and regenerates segments", () => {
    const material = addTextMaterial({
      title: "Original title",
      type: "用户导入",
      level: "A1+",
      contentText: "I need help. Could you call me tomorrow?"
    });

    const updated = updateTextMaterial(material.id, {
      title: "Updated title",
      type: "美国生活",
      level: "A2",
      contentText: "I need to reschedule my appointment. Friday morning works better for me."
    });

    expect(updated?.title).toBe("Updated title");
    expect(updated?.type).toBe("美国生活");
    expect(updated?.level).toBe("A2");
    expect(updated?.segments).toHaveLength(2);
    expect(loadMaterials().find((record) => record.id === material.id)?.title).toBe("Updated title");
  });

  it("deletes user material and archives related learning items", () => {
    const material = addTextMaterial({
      title: "Delete me",
      type: "用户导入",
      level: "A1+",
      contentText: "I want to open a bank account. What documents do I need?"
    });

    saveSegmentAsReviewCard(material, material.segments[0]);

    const result = deleteUserMaterial(material.id);
    const archivedItem = loadLearningItems().find((item) => item.sourceMaterialId === material.id);
    const suspendedCard = loadReviewCards().find(
      (card) => card.learningItemId === archivedItem?.id
    );

    expect(result.deleted).toBe(true);
    expect(loadMaterials().some((record) => record.id === material.id)).toBe(false);
    expect(archivedItem?.status).toBe("archived");
    expect(suspendedCard?.status).toBe("suspended");
  });

  it("does not delete seed materials", () => {
    const seed = loadMaterials().find((material) => material.source === "seed");

    expect(seed).toBeDefined();
    expect(deleteUserMaterial(seed?.id ?? "").deleted).toBe(false);
  });

  it("ships a broader seed material library with real multi-sentence content", () => {
    const seedMaterials = loadMaterials().filter((material) => material.source === "seed");
    const bankMaterial = seedMaterials.find((material) => material.id === "bank-account");

    expect(seedMaterials.length).toBeGreaterThanOrEqual(18);
    expect(bankMaterial?.segments.length).toBeGreaterThanOrEqual(5);
    expect(bankMaterial?.keyExpressions).toContain("checking account");
  });

  it("keeps course track material ids resolvable", () => {
    const seedIds = new Set(loadMaterials().map((material) => material.id));

    courseTracks.forEach((track) => {
      expect(track.materialIds.length).toBeGreaterThan(0);
      expect(track.stages.length).toBeGreaterThan(0);
      track.materialIds.forEach((materialId) => {
        expect(seedIds.has(materialId)).toBe(true);
      });
      track.stages.forEach((stage) => {
        expect(stage.materialIds.length).toBeGreaterThan(0);
        expect(stage.completionCriteria.length).toBeGreaterThanOrEqual(2);
        stage.materialIds.forEach((materialId) => {
          expect(track.materialIds).toContain(materialId);
          expect(seedIds.has(materialId)).toBe(true);
        });
      });
    });
  });

  it("summarizes current course stage progress", () => {
    const materials = loadMaterials();
    const track = courseTracks.find((item) => item.id === "survival-foundation");

    expect(track).toBeDefined();

    const summaries = createCourseStageSummaries(track!, materials);
    const currentStage = summaries.find((stage) => stage.isCurrent);

    expect(summaries).toHaveLength(track!.stages.length);
    expect(currentStage?.id).toBe("survival-medical-shopping");
    expect(currentStage?.progress).toBe(0);
    expect(currentStage?.nextMaterial?.id).toBe("doctor-visit");
  });

  it("moves current course stage after all stage materials are completed", () => {
    const track = courseTracks.find((item) => item.id === "survival-foundation");
    const firstStageIds = new Set(track?.stages[0]?.materialIds ?? []);
    const materials = loadMaterials().map((material) =>
      firstStageIds.has(material.id)
        ? {
            ...material,
            status: "已完成" as const,
            progress: 100
          }
        : material
    );

    const summaries = createCourseStageSummaries(track!, materials);
    const currentStage = summaries.find((stage) => stage.isCurrent);

    expect(currentStage?.id).toBe("survival-services-transit");
    expect(summaries[0]?.progress).toBe(100);
    expect(currentStage?.nextMaterial?.id).toBe("bank-account");
  });

  it("refreshes existing seed material content while preserving user materials", () => {
    const originalMaterials = loadMaterials();
    const oldApartment = originalMaterials.find((material) => material.id === "apartment-tour");
    const userMaterial = addTextMaterial({
      title: "My own note",
      type: "用户导入",
      level: "A1",
      contentText: "I want to practice English every day. This is my own imported text."
    });

    window.localStorage.setItem(
      "learn-english.materials.v1",
      JSON.stringify([
        {
          ...oldApartment,
          contentText: "Old placeholder content.",
          segments: [
            {
              id: "s1",
              order: 1,
              text: "Old placeholder content.",
              familiarity: "重点"
            }
          ],
          progress: 0,
          status: "未开始"
        },
        userMaterial
      ])
    );

    const refreshed = loadMaterials();
    const refreshedApartment = refreshed.find((material) => material.id === "apartment-tour");

    expect(refreshed.some((material) => material.id === userMaterial.id)).toBe(true);
    expect(refreshedApartment?.contentText).toContain("monthly rent");
    expect(refreshedApartment?.segments.length).toBeGreaterThanOrEqual(5);
  });
});
