import { courseTracks, type CourseTrack } from "@/lib/content/course-catalog";
import type { StudyMaterialRecord } from "@/lib/content/types";

export type TodayCoursePlan = {
  activeTrack?: CourseTrack;
  trackMaterials: StudyMaterialRecord[];
  currentMaterial?: StudyMaterialRecord;
  completedInTrack: number;
  trackProgress: number;
};

export function createTodayCoursePlan(
  materials: StudyMaterialRecord[],
  tracks: CourseTrack[] = courseTracks
): TodayCoursePlan {
  const activeTrack =
    tracks.find((track) =>
      track.materialIds.some((id) => {
        const material = materials.find((item) => item.id === id);
        return material && material.status !== "已完成";
      })
    ) ?? tracks[0];
  const trackMaterials = activeTrack
    ? activeTrack.materialIds
        .map((id) => materials.find((material) => material.id === id))
        .filter((material): material is StudyMaterialRecord => Boolean(material))
    : [];
  const currentMaterial =
    trackMaterials.find((material) => material.status !== "已完成") ?? trackMaterials[0] ?? materials[0];
  const completedInTrack = trackMaterials.filter((material) => material.status === "已完成").length;
  const trackProgress = Math.round((completedInTrack / Math.max(1, trackMaterials.length)) * 100);

  return {
    activeTrack,
    trackMaterials,
    currentMaterial,
    completedInTrack,
    trackProgress
  };
}
