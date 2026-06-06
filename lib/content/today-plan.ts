import { courseTracks, type CourseTrack } from "@/lib/content/course-catalog";
import type { StudyMaterialRecord } from "@/lib/content/types";

export type TodayCoursePlan = {
  activeTrack?: CourseTrack;
  trackMaterials: StudyMaterialRecord[];
  currentMaterial?: StudyMaterialRecord;
  completedInTrack: number;
  trackProgress: number;
};

export type DailyStudyDuration = 30 | 45 | 60;

export type DailyStudySessionStep = {
  id: "warmup" | "input" | "intensive" | "output";
  title: string;
  minutes: number;
  description: string;
  status: "done" | "current" | "todo";
};

export type DailyStudySessionPlan = {
  duration: DailyStudyDuration;
  inputMinutes: number;
  reviewMinutes: number;
  outputMinutes: number;
  inputRatio: number;
  steps: DailyStudySessionStep[];
  summary: string;
};

const DURATION_ALLOCATIONS: Record<
  DailyStudyDuration,
  {
    warmup: number;
    input: number;
    intensive: number;
    output: number;
  }
> = {
  30: {
    warmup: 4,
    input: 12,
    intensive: 8,
    output: 6
  },
  45: {
    warmup: 6,
    input: 18,
    intensive: 12,
    output: 9
  },
  60: {
    warmup: 8,
    input: 25,
    intensive: 17,
    output: 10
  }
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

export function createDailyStudySessionPlan(input: {
  duration: DailyStudyDuration;
  currentMaterial?: StudyMaterialRecord;
  dueReviewCount: number;
}): DailyStudySessionPlan {
  const allocation = DURATION_ALLOCATIONS[input.duration];
  const materialTitle = input.currentMaterial?.title ?? "今日推荐材料";
  const sentenceCount = input.currentMaterial?.segments.length ?? 5;
  const warmupTitle = input.dueReviewCount > 0 ? "复习唤醒" : "听前热身";
  const warmupDescription =
    input.dueReviewCount > 0
      ? `先复习 ${Math.min(input.dueReviewCount, 8)} 张到期词句卡，让今天的输入更容易听懂。`
      : "先快速读标题、场景和关键词，让大脑进入英语环境。";
  const inputMinutes = allocation.input + allocation.intensive;
  const outputMinutes = allocation.output;
  const reviewMinutes = allocation.warmup;

  return {
    duration: input.duration,
    inputMinutes,
    reviewMinutes,
    outputMinutes,
    inputRatio: Math.round((inputMinutes / input.duration) * 100),
    summary: `${input.duration} 分钟：${reviewMinutes} 分钟复习，${inputMinutes} 分钟输入，${outputMinutes} 分钟输出。`,
    steps: [
      {
        id: "warmup",
        title: warmupTitle,
        minutes: allocation.warmup,
        description: warmupDescription,
        status: "done"
      },
      {
        id: "input",
        title: "听读输入",
        minutes: allocation.input,
        description: `听读 ${materialTitle}，目标是先听懂大意和高频句，不急着自由发挥。`,
        status: "current"
      },
      {
        id: "intensive",
        title: "逐句精学",
        minutes: allocation.intensive,
        description: `逐句学习 ${sentenceCount} 个句子，保存真正能在生活或工作中复用的表达。`,
        status: "todo"
      },
      {
        id: "output",
        title: "跟读输出",
        minutes: allocation.output,
        description: "跟读、复述或写一两句，把今天输入过的句子说完整、说清楚。",
        status: "todo"
      }
    ]
  };
}
