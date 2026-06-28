"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, BarChart3, Clock3, Map, TrendingUp } from "lucide-react";
import {
  learningBalance,
  progressStats,
  scenarioMap,
  weaknessInsights,
  weeklyTimeline
} from "@/lib/mock-data";
import {
  summarizeStudyActivities,
  type ActivitySummary,
  type WeeklyActivityDay
} from "@/lib/analytics/progress-store";
import { summarizeOutputErrors, type OutputErrorSummary } from "@/lib/analytics/output-error-stats";
import {
  createOutputWeaknessProfile,
  type OutputWeaknessProfile
} from "@/lib/analytics/output-weakness-profile";
import { loadLearningItems } from "@/lib/review/review-store";
import { loadPracticeAttempts } from "@/lib/speech/practice-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProgressStat = {
  label: string;
  value: string;
  hint: string;
};

type BalanceItem = {
  label: string;
  value: number;
  minutes: number;
};

type ProgressViewState = {
  stats: ProgressStat[];
  balance: BalanceItem[];
  timeline: WeeklyActivityDay[];
  outputErrorSummary: OutputErrorSummary;
  outputWeaknessProfile: OutputWeaknessProfile;
};

function createBalance(summary: ActivitySummary): BalanceItem[] {
  const totalMinutes = summary.inputMinutes + summary.outputMinutes + summary.reviewMinutes;

  if (totalMinutes === 0) {
    return learningBalance.map((item) => ({
      ...item,
      value: 0,
      minutes: 0
    }));
  }

  return [
    {
      label: "听读输入",
      minutes: summary.inputMinutes,
      value: Math.round((summary.inputMinutes / totalMinutes) * 100)
    },
    {
      label: "输出练习",
      minutes: summary.outputMinutes,
      value: Math.round((summary.outputMinutes / totalMinutes) * 100)
    },
    {
      label: "复习巩固",
      minutes: summary.reviewMinutes,
      value: Math.round((summary.reviewMinutes / totalMinutes) * 100)
    }
  ];
}

function createStats(summary: ActivitySummary, activeItemCount: number): ProgressStat[] {
  return [
    {
      label: "输入分钟",
      value: String(summary.inputMinutes),
      hint: "本周听读和 AI 精学"
    },
    {
      label: "保存词句",
      value: String(summary.assetEvents),
      hint: "本周沉淀"
    },
    {
      label: "掌握词句",
      value: String(activeItemCount),
      hint: "来自真实材料"
    },
    {
      label: "完成复习",
      value: String(summary.reviewEvents),
      hint: "本周评分"
    }
  ];
}

function createInitialState(): ProgressViewState {
  return {
    stats: progressStats,
    balance: learningBalance,
    timeline: weeklyTimeline,
    outputErrorSummary: summarizeOutputErrors([]),
    outputWeaknessProfile: createOutputWeaknessProfile([])
  };
}

export function ProgressClient() {
  const [viewState, setViewState] = useState<ProgressViewState>(() => createInitialState());

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const summary = summarizeStudyActivities();
      const activeItemCount = loadLearningItems().filter((item) => item.status !== "archived").length;
      const practiceAttempts = loadPracticeAttempts();
      const outputErrorSummary = summarizeOutputErrors(practiceAttempts);
      const outputWeaknessProfile = createOutputWeaknessProfile(practiceAttempts);

      setViewState({
        stats: createStats(summary, activeItemCount),
        balance: createBalance(summary),
        timeline: summary.weeklyTimeline,
        outputErrorSummary,
        outputWeaknessProfile
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const maxMinutes = useMemo(
    () => Math.max(1, ...viewState.timeline.map((day) => day.input + day.output + day.review)),
    [viewState.timeline]
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge variant="soft">进度</Badge>
              <h1 className="mt-3 text-2xl font-semibold text-foreground">本周学习复盘</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                不只看打卡，更看输入量、输出次数、复习完成和真实场景能力。
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-foreground" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {viewState.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-white p-4">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
                <p className="mt-1 text-xs text-muted">{stat.hint}</p>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">学习比例</CardTitle>
            <TrendingUp className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>输入、输出和复习要保持可持续配比。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewState.balance.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted">
                    {item.value}% · {item.minutes} 分钟
                  </span>
                </div>
                <Progress value={item.value} className="mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">每日分布</CardTitle>
            <Clock3 className="h-5 w-5 text-foreground" />
          </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewState.timeline.map((day) => {
              const total = day.input + day.output + day.review;
              const width = Math.round((total / maxMinutes) * 100);
              const inputWidth = total > 0 ? (day.input / total) * 100 : 0;
              const outputWidth = total > 0 ? (day.output / total) * 100 : 0;
              const reviewWidth = total > 0 ? (day.review / total) * 100 : 0;

              return (
                <div key={day.day} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{day.day}</span>
                    <span className="text-muted">{total} 分钟</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-panel-strong">
                    <div className="flex h-3 overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                      <div className="bg-foreground" style={{ width: `${inputWidth}%` }} />
                      <div className="bg-muted" style={{ width: `${outputWidth}%` }} />
                      <div className="bg-border" style={{ width: `${reviewWidth}%` }} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    输入 {day.input} · 输出 {day.output} · 复习 {day.review}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">输出薄弱项</CardTitle>
            <AlertCircle className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>
            {viewState.outputErrorSummary.attemptCount > 0
              ? `来自 ${viewState.outputErrorSummary.attemptCount} 条练习记录，平均完成度 ${
                  viewState.outputErrorSummary.averageScore ? `${viewState.outputErrorSummary.averageScore}%` : "-"
                }。`
              : "完成跟读、复述、写作或角色练习后，这里会生成真实薄弱项。"}
          </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-panel-strong p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="soft">长期画像</Badge>
                    <Badge variant={viewState.outputWeaknessProfile.riskLevel === "high" ? "outline" : "default"}>
                      {viewState.outputWeaknessProfile.levelLabel}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {viewState.outputWeaknessProfile.weeklyTarget}
                  </p>
                </div>
                <div className="grid min-w-40 grid-cols-2 gap-2 text-right sm:text-left">
                  <div>
                    <p className="text-xs text-muted">平均</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {viewState.outputWeaknessProfile.averageScore
                        ? `${viewState.outputWeaknessProfile.averageScore}%`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">记录</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {viewState.outputWeaknessProfile.attemptCount}
                    </p>
                  </div>
                </div>
              </div>
              {viewState.outputWeaknessProfile.primaryFocus ? (
                <p className="mt-3 text-sm leading-6 text-muted">
                  主攻：{viewState.outputWeaknessProfile.primaryFocus.label}。
                  {viewState.outputWeaknessProfile.primaryFocus.action}
                </p>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {viewState.outputWeaknessProfile.nextTrainingPlan.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="rounded-lg border border-border bg-white p-3 transition hover:bg-panel-strong"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <Badge variant="outline">{item.priority}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.detail}</p>
                  </a>
                ))}
              </div>
            </div>

            {viewState.outputErrorSummary.categories.length > 0 ? (
              viewState.outputErrorSummary.categories.slice(0, 4).map((category) => (
                <article key={category.id} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{category.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{category.detail}</p>
                    </div>
                    <Badge variant="outline">{category.count} 次</Badge>
                  </div>
                  <Progress value={category.severity} className="mt-3" />
                  <p className="mt-3 rounded-lg bg-panel-strong px-3 py-2 text-sm leading-6 text-muted">
                    {category.action}
                  </p>
                  {category.examples.length > 0 ? (
                    <p className="mt-2 text-xs leading-5 text-muted">
                      来源：{category.examples.join("、")}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              weaknessInsights.map((insight) => (
                <article key={insight.title} className="rounded-lg border border-border bg-white p-4">
                  <h3 className="font-semibold text-foreground">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{insight.detail}</p>
                  <p className="mt-3 rounded-lg bg-panel-strong px-3 py-2 text-sm leading-6 text-muted">
                    {insight.action}
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">场景能力地图</CardTitle>
          <Map className="h-5 w-5 text-foreground" />
        </div>
        <CardDescription>把学习目标落到美国生活、工作和移民场景里。</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scenarioMap.map((scenario) => (
            <div key={scenario.name} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{scenario.name}</p>
                  <p className="mt-1 text-sm text-muted">{scenario.status}</p>
                </div>
                <Activity className="h-4 w-4 shrink-0 text-foreground" />
              </div>
              <Progress value={scenario.progress} className="mt-3" />
            </div>
          ))}
        </div>
        </CardContent>
      </Card>
    </main>
  );
}
