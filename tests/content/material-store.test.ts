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
});
