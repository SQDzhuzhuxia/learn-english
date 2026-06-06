import { courseTracks, type CourseTrack } from "@/lib/content/course-catalog";
import type { StudyMaterialRecord } from "@/lib/content/types";
import type { OutputErrorCategory, OutputErrorSummary } from "@/lib/analytics/output-error-stats";

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

export type DailyStudyActivitySnapshot = {
  inputMinutes: number;
  outputMinutes: number;
  reviewMinutes: number;
};

export type TodaySmartRecommendation = {
  priority: "review" | "input" | "output" | "pronunciation" | "writing" | "roleplay" | "course";
  label: string;
  title: string;
  detail: string;
  reason: string;
  actionLabel: string;
  href: string;
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

function getPracticeTarget(category: OutputErrorCategory): Pick<TodaySmartRecommendation, "priority" | "label" | "title" | "detail" | "actionLabel" | "href"> {
  if (category.id === "pronunciation" || category.id === "fluency") {
    return {
      priority: "pronunciation",
      label: category.label,
      title: "先补一轮跟读",
      detail: `${category.detail} ${category.action}`,
      actionLabel: "去做跟读",
      href: "/practice#practice-shadowing"
    };
  }

  if (category.id === "grammar-naturalness" || category.id === "sentence-completeness" || category.id === "vocabulary") {
    return {
      priority: "writing",
      label: category.label,
      title: "先做一段短写作",
      detail: `${category.detail} ${category.action}`,
      actionLabel: "去做写作",
      href: "/practice#practice-writing"
    };
  }

  return {
    priority: "roleplay",
    label: category.label,
    title: "先做一次场景问答",
    detail: `${category.detail} ${category.action}`,
    actionLabel: "去做角色演练",
    href: "/practice#practice-roleplay"
  };
}

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

export function createTodaySmartRecommendation(input: {
  coursePlan: TodayCoursePlan;
  sessionPlan: DailyStudySessionPlan;
  activitySummary?: DailyStudyActivitySnapshot;
  outputErrorSummary?: OutputErrorSummary;
  dueReviewCount: number;
}): TodaySmartRecommendation {
  const currentMaterialHref = input.coursePlan.currentMaterial ? `/study/${input.coursePlan.currentMaterial.id}` : "/study";
  const currentMaterialTitle = input.coursePlan.currentMaterial?.title ?? "今日推荐材料";
  const activeTrackTitle = input.coursePlan.activeTrack?.title ?? "当前课程路径";
  const activitySummary = input.activitySummary ?? {
    inputMinutes: 0,
    outputMinutes: 0,
    reviewMinutes: 0
  };

  if (input.dueReviewCount >= 8) {
    return {
      priority: "review",
      label: "复习优先",
      title: "先清掉到期词句卡",
      detail: `现在有 ${input.dueReviewCount} 张到期卡。先花 ${input.sessionPlan.reviewMinutes} 分钟唤醒旧句子，再进入新材料会轻松很多。`,
      reason: "复习压力较高，先把已经学过的句子重新激活。",
      actionLabel: "开始复习",
      href: "/review"
    };
  }

  const topWeakness = input.outputErrorSummary?.categories[0];

  if (topWeakness && topWeakness.severity >= 50) {
    const practiceTarget = getPracticeTarget(topWeakness);

    return {
      ...practiceTarget,
      reason: `最近输出薄弱项是“${topWeakness.label}”，强度 ${topWeakness.severity}%。`
    };
  }

  if (activitySummary.inputMinutes < input.sessionPlan.inputMinutes) {
    return {
      priority: "input",
      label: "输入优先",
      title: `继续学 ${currentMaterialTitle}`,
      detail: `本周已记录 ${activitySummary.inputMinutes} 分钟输入，今天建议先完成 ${input.sessionPlan.inputMinutes} 分钟听读和逐句精学。`,
      reason: "当前阶段最缺的是可理解输入，先把材料听懂、读顺、存下可复用表达。",
      actionLabel: "进入学习器",
      href: currentMaterialHref
    };
  }

  if (activitySummary.outputMinutes < input.sessionPlan.outputMinutes) {
    return {
      priority: "output",
      label: "输出补齐",
      title: "做一次跟读或复述",
      detail: `今天的输入已经够启动输出了。用 ${input.sessionPlan.outputMinutes} 分钟把刚学过的句子说完整。`,
      reason: "输入之后立刻做少量输出，更容易把句子变成自己的表达。",
      actionLabel: "去做练习",
      href: "/practice#practice-shadowing"
    };
  }

  return {
    priority: "course",
    label: "路径推进",
    title: `推进 ${activeTrackTitle}`,
    detail: `当前路径进度 ${input.coursePlan.trackProgress}%。下一步继续围绕 ${currentMaterialTitle} 做听读、保存和输出。`,
    reason: "复习和输出压力都不高，可以稳定推进课程路径。",
    actionLabel: "继续课程",
    href: currentMaterialHref
  };
}
