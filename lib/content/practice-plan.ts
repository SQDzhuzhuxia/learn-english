import type { StudyMaterialRecord } from "@/lib/content/types";

export type TodayPracticeTaskId = "shadowing" | "retelling" | "writing";

export type TodayPracticeTask = {
  id: TodayPracticeTaskId;
  title: string;
  focus: string;
  prompt: string;
  keywords: string[];
  href: string;
};

export type TodayPracticePlan = {
  materialId?: string;
  materialTitle: string;
  hasMaterial: boolean;
  tasks: TodayPracticeTask[];
};

function pickShadowingSentences(material: StudyMaterialRecord | undefined, count: number): string[] {
  const segments = material?.segments ?? [];

  if (segments.length === 0) {
    return [];
  }

  const focusFirst = [...segments].sort((a, b) => {
    const aWeight = a.familiarity === "重点" ? 0 : 1;
    const bWeight = b.familiarity === "重点" ? 0 : 1;

    if (aWeight !== bWeight) {
      return aWeight - bWeight;
    }

    return a.order - b.order;
  });

  return focusFirst.slice(0, count).map((segment) => segment.text);
}

export function createTodayPracticePlan(material?: StudyMaterialRecord): TodayPracticePlan {
  const materialTitle = material?.title ?? "今日推荐材料";
  const hasMaterial = Boolean(material && material.segments.length > 0);
  const shadowingSentences = pickShadowingSentences(material, 3);
  const keyExpressions = material?.keyExpressions ?? [];
  const retellingKeywords = keyExpressions.slice(0, 3);
  const primaryExpression = keyExpressions[0];

  const tasks: TodayPracticeTask[] = [
    {
      id: "shadowing",
      title: "跟读",
      focus: hasMaterial
        ? `跟读 ${materialTitle} 的 ${shadowingSentences.length} 个关键句`
        : "先选择今日材料，再开始跟读",
      prompt: shadowingSentences[0] ?? "进入今日材料后，跟读你保存的重点句。",
      keywords: shadowingSentences,
      href: "/practice#practice-shadowing"
    },
    {
      id: "retelling",
      title: "复述",
      focus: hasMaterial
        ? `用 2-3 句话复述 ${materialTitle} 的大意`
        : "完成输入后，复述今天材料的大意",
      prompt: material?.summary
        ? `用简单英文复述：${material.summary}`
        : "用 2-3 句简单英文，复述今天材料的主要内容。",
      keywords: retellingKeywords,
      href: "/practice#practice-retelling"
    },
    {
      id: "writing",
      title: "短写作",
      focus: primaryExpression
        ? `用「${primaryExpression}」写一句真实场景的话`
        : "写一句今天能用上的英文",
      prompt: primaryExpression
        ? `用英文写一句话，用上「${primaryExpression}」，场景围绕 ${materialTitle}。`
        : `用英文写一句关于 ${materialTitle} 的话。`,
      keywords: primaryExpression ? [primaryExpression] : [],
      href: "/practice#practice-writing"
    }
  ];

  return {
    materialId: material?.id,
    materialTitle,
    hasMaterial,
    tasks
  };
}
