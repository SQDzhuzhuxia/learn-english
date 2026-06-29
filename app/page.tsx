"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  BookmarkCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  Headphones,
  Mic,
  PenLine,
  Play,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  getSeedMaterials,
  loadMaterials,
  setCurrentMaterialId
} from "@/lib/content/material-store";
import {
  createDailyStudySessionPlan,
  createTodaySmartRecommendation,
  createTodayCoursePlan,
  type DailyStudyDuration
} from "@/lib/content/today-plan";
import { createTodayPracticePlan, type TodayPracticeTaskId } from "@/lib/content/practice-plan";
import { createCourseStageRetrospective } from "@/lib/content/course-catalog";
import { loadStudyActivities, summarizeStudyActivities } from "@/lib/analytics/progress-store";
import { summarizeOutputErrors } from "@/lib/analytics/output-error-stats";
import { loadPracticeAttempts } from "@/lib/speech/practice-store";
import {
  isCardDue,
  loadLearningItems,
  loadReviewCards
} from "@/lib/review/review-store";
import type { ReviewCardRecord } from "@/lib/review/types";

const stepIcons = {
  warmup: BookmarkCheck,
  input: Headphones,
  intensive: BookOpenText,
  output: Mic
};

const practiceTaskIcons: Record<TodayPracticeTaskId, typeof Mic> = {
  shadowing: Mic,
  retelling: ClipboardCheck,
  writing: PenLine
};

const durationOptions: DailyStudyDuration[] = [30, 45, 60];

function formatTodayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(new Date());
}

function createTodayProgressStats(input: {
  inputMinutes: number;
  outputEvents: number;
  reviewEvents: number;
  activeItemCount: number;
}) {
  return [
    {
      label: "本周输入",
      value: `${input.inputMinutes}`,
      hint: "真实听读/精学分钟"
    },
    {
      label: "输出次数",
      value: `${input.outputEvents}`,
      hint: "跟读、复述、写作、角色"
    },
    {
      label: "完成复习",
      value: `${input.reviewEvents}`,
      hint: "本周真实评分"
    },
    {
      label: "词句资产",
      value: `${input.activeItemCount}`,
      hint: "当前活跃复习内容"
    }
  ];
}

export default function TodayPage() {
  const [materials, setMaterials] = useState(() => getSeedMaterials());
  const [studyDuration, setStudyDuration] = useState<DailyStudyDuration>(30);
  const [activitySummary, setActivitySummary] = useState(() => summarizeStudyActivities([]));
  const [outputErrorSummary, setOutputErrorSummary] = useState(() => summarizeOutputErrors([]));
  const [dueCards, setDueCards] = useState<ReviewCardRecord[]>([]);
  const [activeItemCount, setActiveItemCount] = useState(0);
  const coursePlan = useMemo(
    () => createTodayCoursePlan(materials),
    [materials]
  );
  const { activeTrack, currentMaterial, currentStage, trackProgress } = coursePlan;
  const sessionPlan = useMemo(
    () =>
      createDailyStudySessionPlan({
        duration: studyDuration,
        currentMaterial,
        dueReviewCount: dueCards.length
      }),
    [currentMaterial, dueCards.length, studyDuration]
  );
  const smartRecommendation = useMemo(
    () =>
      createTodaySmartRecommendation({
        coursePlan,
        sessionPlan,
        activitySummary,
        outputErrorSummary,
        dueReviewCount: dueCards.length
      }),
    [activitySummary, coursePlan, dueCards.length, outputErrorSummary, sessionPlan]
  );
  const practicePlan = useMemo(
    () => createTodayPracticePlan(currentMaterial),
    [currentMaterial]
  );
  const retrospective = useMemo(
    () => (activeTrack ? createCourseStageRetrospective(activeTrack, materials) : undefined),
    [activeTrack, materials]
  );
  const currentMaterialHref = currentMaterial ? `/study/${currentMaterial.id}` : "/study";
  const todayProgressStats = useMemo(
    () =>
      createTodayProgressStats({
        inputMinutes: activitySummary.inputMinutes,
        outputEvents: activitySummary.outputEvents,
        reviewEvents: activitySummary.reviewEvents,
        activeItemCount
      }),
    [activeItemCount, activitySummary.inputMinutes, activitySummary.outputEvents, activitySummary.reviewEvents]
  );
  const totalMinutes = activitySummary.inputMinutes + activitySummary.outputMinutes + activitySummary.reviewMinutes;
  const todayHabits = [
    {
      label: "本周真实学习",
      value: `${totalMinutes} 分钟`
    },
    {
      label: "到期复习",
      value: `${dueCards.length} 张`
    },
    {
      label: "输出记录",
      value: `${outputErrorSummary.attemptCount} 次`
    }
  ];
  const todayQueue = [
    {
      id: "course-input",
      label: activeTrack?.levelRange ?? "A1-A2",
      title: currentMaterial?.title ?? "选择今日材料",
      action: "进入材料",
      href: currentMaterialHref
    },
    {
      id: "review-due",
      label: "到期",
      title: `${dueCards.length} 张词句卡`,
      action: "开始复习",
      href: "/review"
    },
    {
      id: "output",
      label: "输出",
      title: "跟读、复述或短写作",
      action: "去练习",
      href: "/practice"
    }
  ];

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setMaterials(loadMaterials());
        setActivitySummary(summarizeStudyActivities(loadStudyActivities()));
        setOutputErrorSummary(summarizeOutputErrors(loadPracticeAttempts()));
        setDueCards(loadReviewCards().filter((card) => card.status !== "suspended" && isCardDue(card)));
        setActiveItemCount(loadLearningItems().filter((item) => item.status !== "archived").length);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="pt-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Badge variant="soft">{formatTodayLabel()} · 今日计划</Badge>
              <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
                {sessionPlan.duration} 分钟英语输入闭环
              </h1>
              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-muted">
                当前路径：{activeTrack?.title ?? "英语基础路径"}。今天从 {currentMaterial?.title ?? "推荐材料"} 开始，先听读和逐句理解，再做少量输出。
              </p>
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-lg border border-border bg-panel-strong p-3 lg:w-56">
              <div className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>今日节奏</span>
                <span>{sessionPlan.inputRatio}% 输入</span>
              </div>
              <Progress value={sessionPlan.inputRatio} />
              <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1">
                {durationOptions.map((duration) => (
                  <Button
                    key={duration}
                    type="button"
                    variant={studyDuration === duration ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStudyDuration(duration)}
                    className="w-full min-w-0 px-1"
                  >
                    {duration}
                  </Button>
                ))}
              </div>
              <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                <span className="min-w-0 break-words">{sessionPlan.summary}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sessionPlan.steps.map((step, index) => {
              const StepIcon = stepIcons[step.id];

              return (
              <article
                key={step.id}
                className={`rounded-lg border p-4 ${
                  step.status === "current"
                    ? "border-foreground/15 bg-panel-strong"
                    : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground">
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-muted">{step.minutes} 分钟</span>
                </div>
                <p className="mt-4 text-xs font-medium text-muted">Step {index + 1}</p>
                <h2 className="mt-1 text-base font-semibold text-foreground">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-panel-strong p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <Badge variant="soft">
                  <Sparkles className="h-3.5 w-3.5" />
                  {smartRecommendation.label}
                </Badge>
                <h2 className="mt-3 break-words text-lg font-semibold text-foreground">
                  {smartRecommendation.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{smartRecommendation.detail}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{smartRecommendation.reason}</p>
              </div>
              <Button asChild className="w-full shrink-0 md:w-auto">
                <Link
                  href={smartRecommendation.href}
                  onClick={() => smartRecommendation.href.startsWith("/study/") && currentMaterial && setCurrentMaterialId(currentMaterial.id)}
                >
                  {smartRecommendation.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={currentMaterialHref} onClick={() => currentMaterial && setCurrentMaterialId(currentMaterial.id)}>
                <Play className="h-4 w-4" />
                继续今日学习
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/review">
                <RefreshCcw className="h-4 w-4" />
                先完成复习
              </Link>
            </Button>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">当前材料</p>
              <h2 className="mt-2 break-words text-xl font-semibold text-foreground">
                {currentMaterial?.title ?? "选择今日材料"}
              </h2>
            </div>
            <BookOpenText className="h-5 w-5 text-foreground" />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-muted">
                <span>{currentMaterial?.type ?? "材料"} · {currentMaterial?.level ?? "A1-A2"}</span>
                <span>{currentMaterial?.progress ?? 0}%</span>
              </div>
              <Progress value={currentMaterial?.progress ?? 0} className="mt-2" />
            </div>

            <div className="rounded-lg border border-border bg-panel-strong p-4">
              <p className="text-sm font-semibold text-foreground">
                {activeTrack?.weeklyGoal ?? "每天 30-60 分钟输入和少量输出"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                路径进度 {trackProgress}%。{currentMaterial?.summary ?? "先从当前材料开始，把句子听懂、读顺、保存下来。"}
              </p>
            </div>

            {currentStage ? (
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">当前阶段</p>
                    <p className="mt-1 break-words text-sm font-semibold text-foreground">
                      {currentStage.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {currentStage.completed}/{currentStage.total}
                  </span>
                </div>
                <Progress value={currentStage.progress} className="mt-3" />
                <p className="mt-3 text-sm leading-6 text-muted">{currentStage.goal}</p>
                <div className="mt-3 space-y-2">
                  {currentStage.completionCriteria.slice(0, 2).map((criterion) => (
                    <p key={criterion} className="rounded-lg bg-panel-strong px-3 py-2 text-xs text-muted">
                      {criterion}
                    </p>
                  ))}
                </div>
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-xs leading-5 text-muted">
                  输出任务：{currentStage.outputTask}
                </p>
              </div>
            ) : null}

            {retrospective ? (
              <div className="rounded-lg border border-border bg-panel-strong p-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-foreground" />
                  <p className="text-sm font-semibold text-foreground">阶段复盘</p>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-foreground">
                  {retrospective.headline}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{retrospective.advice}</p>
                {retrospective.completedStageTitles.length > 0 ? (
                  <p className="mt-2 break-words text-xs leading-5 text-muted">
                    已完成阶段：{retrospective.completedStageTitles.join("、")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href={currentMaterialHref} onClick={() => currentMaterial && setCurrentMaterialId(currentMaterial.id)}>
                进入学习器
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="soft">今日队列</Badge>
              <CardTitle className="mt-3">下一步做什么</CardTitle>
            </div>
            <Headphones className="h-5 w-5 text-foreground" />
          </div>
          </CardHeader>
          <CardContent>
          <div className="divide-y divide-border rounded-lg border border-border bg-white">
            {todayQueue.map((item) => (
              <Link
                href={item.href}
                key={item.id}
                onClick={() => item.id === "course-input" && currentMaterial && setCurrentMaterialId(currentMaterial.id)}
                className="flex flex-col gap-3 p-4 transition hover:bg-panel-strong sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{item.label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-foreground">{item.title}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted">
                  {item.action}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>今日复习</CardTitle>
              <CalendarCheck className="h-5 w-5 text-foreground" />
            </div>
            <CardDescription>
              {dueCards.length} 张词句卡到期，优先复习来自真实材料的句子。
            </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-2">
              {dueCards.slice(0, 3).map((card) => (
                <div key={card.id} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-sm font-medium text-foreground">{card.front}</p>
                  <p className="mt-1 text-xs text-muted">{card.cardType} · {card.status}</p>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>本周进度</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-foreground" />
            </div>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {todayProgressStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
                  <p className="mt-1 text-xs text-muted">{stat.hint}</p>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="soft">今日练习</Badge>
              <CardTitle className="mt-3">把今天的材料说出来、写出来</CardTitle>
            </div>
            <Mic className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>
            下面的跟读、复述和短写作都来自 {practicePlan.materialTitle}，点击直接进入练习页对应模块。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {practicePlan.tasks.map((task) => {
              const TaskIcon = practiceTaskIcons[task.id];

              return (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-white p-4 transition hover:bg-panel-strong"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                      <TaskIcon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  <p className="text-xs leading-5 text-muted">{task.focus}</p>
                  <p className="min-w-0 break-words rounded-lg bg-panel-strong px-3 py-2 text-xs leading-5 text-foreground">
                    {task.prompt}
                  </p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="soft">学习原则</Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">今天只需要跟着流程走</h2>
          </div>
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            {todayHabits.map((habit) => (
              <div key={habit.label} className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="font-semibold text-foreground">{habit.value}</p>
                <p className="mt-1 text-xs">{habit.label}</p>
              </div>
            ))}
          </div>
        </div>
        <Separator className="my-4" />
        <p className="mt-4 text-sm leading-6 text-muted">
          初级阶段不靠硬聊推进，先让听读输入变得可理解；输出只做跟读、复述和短句表达，所有不会的内容进入复习。
        </p>
        </CardContent>
      </Card>
    </main>
  );
}
