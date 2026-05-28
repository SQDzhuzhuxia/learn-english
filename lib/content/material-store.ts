"use client";

import { materials as seedCards, studySegments } from "@/lib/mock-data";
import { recordStudyActivity } from "@/lib/analytics/progress-store";
import { estimateReadingMinutes, splitTextIntoSegments } from "@/lib/content/split-text";
import type { NewTextMaterialInput, StudyMaterialRecord } from "@/lib/content/types";
import { archiveLearningItemsByMaterialId } from "@/lib/review/review-store";

const MATERIALS_KEY = "learn-english.materials.v1";
const CURRENT_MATERIAL_KEY = "learn-english.current-material-id.v1";

const seedContent =
  "I have had a sore throat since yesterday. I would like to make an appointment with a doctor. Do you have any openings this afternoon? Could you please spell your last name? Please arrive fifteen minutes early to fill out the forms.";

function nowIso() {
  return new Date().toISOString();
}

export function getSeedMaterials(): StudyMaterialRecord[] {
  return seedCards.map((material, index) => {
    const contentText = index === 0 ? seedContent : `${material.summary} ${material.keyExpressions.join(". ")}.`;
    const segments =
      index === 0
        ? studySegments.map((segment) => ({
            id: segment.id,
            order: segment.order,
            text: segment.text,
            translation: segment.translation,
            note: segment.note,
            familiarity: segment.familiarity as StudyMaterialRecord["segments"][number]["familiarity"]
          }))
        : splitTextIntoSegments(contentText);

    return {
      ...material,
      status: material.status as StudyMaterialRecord["status"],
      contentText,
      segments,
      source: "seed",
      currentSegmentOrder: index === 0 ? 2 : 1,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z"
    };
  });
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadMaterials(): StudyMaterialRecord[] {
  const seedMaterials = getSeedMaterials();

  if (!canUseStorage()) {
    return seedMaterials;
  }

  const raw = window.localStorage.getItem(MATERIALS_KEY);

  if (!raw) {
    window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(seedMaterials));
    return seedMaterials;
  }

  try {
    const parsed = JSON.parse(raw) as StudyMaterialRecord[];
    const seedIds = new Set(seedMaterials.map((material) => material.id));
    const missingSeeds = seedMaterials.filter(
      (material) => !parsed.some((item) => item.id === material.id)
    );
    const normalized = [
      ...parsed.filter((material) => material.source === "user" || seedIds.has(material.id)),
      ...missingSeeds
    ];

    return normalized;
  } catch {
    window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(seedMaterials));
    return seedMaterials;
  }
}

export function saveMaterials(materials: StudyMaterialRecord[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
}

export function createTextMaterial(input: NewTextMaterialInput): StudyMaterialRecord {
  const timestamp = nowIso();
  const id = `user-${Date.now()}`;
  const segments = splitTextIntoSegments(input.contentText);

  return {
    id,
    title: input.title.trim(),
    type: input.type,
    level: input.level,
    minutes: estimateReadingMinutes(input.contentText),
    status: "未开始",
    progress: 0,
    knownRate: 0,
    inputType: "用户导入文本",
    priority: "用户导入",
    summary: input.contentText.trim().slice(0, 120),
    keyExpressions: segments.slice(0, 3).map((segment) => segment.text.split(/\s+/).slice(0, 4).join(" ")),
    contentText: input.contentText.trim(),
    segments,
    source: "user",
    currentSegmentOrder: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createMaterialFields(input: NewTextMaterialInput) {
  const contentText = input.contentText.trim();
  const segments = splitTextIntoSegments(contentText);

  return {
    title: input.title.trim(),
    type: input.type,
    level: input.level,
    minutes: estimateReadingMinutes(contentText),
    summary: contentText.slice(0, 120),
    keyExpressions: segments
      .slice(0, 3)
      .map((segment) => segment.text.split(/\s+/).slice(0, 4).join(" ")),
    contentText,
    segments
  };
}

export function addTextMaterial(input: NewTextMaterialInput) {
  const materials = loadMaterials();
  const material = createTextMaterial(input);
  saveMaterials([material, ...materials]);
  setCurrentMaterialId(material.id);
  return material;
}

export function updateTextMaterial(id: string, input: NewTextMaterialInput) {
  const materials = loadMaterials();
  let updatedMaterial: StudyMaterialRecord | undefined;

  const updatedMaterials = materials.map((material) => {
    if (material.id !== id || material.source !== "user") {
      return material;
    }

    const nextFields = createMaterialFields(input);
    const currentSegmentOrder = Math.min(
      material.currentSegmentOrder,
      Math.max(1, nextFields.segments.length)
    );
    const progress =
      material.progress === 0
        ? 0
        : Math.min(
            100,
            Math.round((currentSegmentOrder / Math.max(1, nextFields.segments.length)) * 100)
          );

    updatedMaterial = {
      ...material,
      ...nextFields,
      currentSegmentOrder,
      progress,
      status: progress >= 100 ? "已完成" : progress > 0 ? "学习中" : "未开始",
      updatedAt: nowIso()
    };

    return updatedMaterial;
  });

  saveMaterials(updatedMaterials);

  return updatedMaterial;
}

export function deleteUserMaterial(id: string) {
  const materials = loadMaterials();
  const materialToDelete = materials.find((material) => material.id === id);

  if (!materialToDelete || materialToDelete.source !== "user") {
    return {
      deleted: false,
      archivedItems: 0,
      suspendedCards: 0
    };
  }

  const nextMaterials = materials.filter((material) => material.id !== id);
  const archiveResult = archiveLearningItemsByMaterialId(id);
  saveMaterials(nextMaterials);

  if (getCurrentMaterialId() === id) {
    const nextCurrent = nextMaterials[0]?.id;

    if (nextCurrent) {
      setCurrentMaterialId(nextCurrent);
    } else if (canUseStorage()) {
      window.localStorage.removeItem(CURRENT_MATERIAL_KEY);
    }
  }

  return {
    deleted: true,
    ...archiveResult
  };
}

export function findMaterialById(id: string) {
  return loadMaterials().find((material) => material.id === id);
}

export function setCurrentMaterialId(id: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(CURRENT_MATERIAL_KEY, id);
}

export function getCurrentMaterialId() {
  if (!canUseStorage()) {
    return undefined;
  }

  return window.localStorage.getItem(CURRENT_MATERIAL_KEY) ?? undefined;
}

export function updateMaterialProgress(id: string, currentSegmentOrder: number) {
  const materials = loadMaterials();
  const previousMaterial = materials.find((material) => material.id === id);
  const updated = materials.map((material) => {
    if (material.id !== id) {
      return material;
    }

    const progress = Math.min(
      100,
      Math.round((currentSegmentOrder / Math.max(1, material.segments.length)) * 100)
    );

    return {
      ...material,
      currentSegmentOrder,
      progress,
      status: progress >= 100 ? "已完成" : "学习中",
      updatedAt: nowIso()
    } satisfies StudyMaterialRecord;
  });

  saveMaterials(updated);
  setCurrentMaterialId(id);
  const updatedMaterial = updated.find((material) => material.id === id);

  if (updatedMaterial && previousMaterial?.currentSegmentOrder !== currentSegmentOrder) {
    recordStudyActivity({
      type: "input",
      label: `逐句学习：${updatedMaterial.title}`,
      minutes: 1,
      materialId: updatedMaterial.id,
      materialTitle: updatedMaterial.title
    });
  }

  return updatedMaterial;
}
