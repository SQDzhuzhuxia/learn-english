import { Activity, AlertCircle, BarChart3, Clock3, Map, TrendingUp } from "lucide-react";
import {
  learningBalance,
  progressStats,
  scenarioMap,
  weaknessInsights,
  weeklyTimeline
} from "@/lib/mock-data";

export default function ProgressPage() {
  const maxMinutes = Math.max(
    ...weeklyTimeline.map((day) => day.input + day.output + day.review)
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-accent">进度</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">本周学习复盘</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                不只看打卡，更看输入量、输出次数、复习完成和真实场景能力。
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {progressStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-white p-4">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
                <p className="mt-1 text-xs text-muted">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">学习比例</h2>
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-4">
            {learningBalance.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted">{item.value}% · {item.minutes} 分钟</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-panel-strong">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">每日分布</h2>
            <Clock3 className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-5 space-y-4">
            {weeklyTimeline.map((day) => {
              const total = day.input + day.output + day.review;
              const width = Math.round((total / maxMinutes) * 100);

              return (
                <div key={day.day} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{day.day}</span>
                    <span className="text-muted">{total} 分钟</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-panel-strong">
                    <div className="flex h-3 overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                      <div className="bg-accent" style={{ width: `${(day.input / total) * 100}%` }} />
                      <div className="bg-sky-500" style={{ width: `${(day.output / total) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(day.review / total) * 100}%` }} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    输入 {day.input} · 输出 {day.output} · 复习 {day.review}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">当前弱项</h2>
            <AlertCircle className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {weaknessInsights.map((insight) => (
              <article key={insight.title} className="rounded-lg border border-border bg-white p-4">
                <h3 className="font-semibold text-foreground">{insight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{insight.detail}</p>
                <p className="mt-3 rounded-lg bg-panel-strong px-3 py-2 text-sm leading-6 text-muted">
                  {insight.action}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">场景能力地图</h2>
          <Map className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scenarioMap.map((scenario) => (
            <div key={scenario.name} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{scenario.name}</p>
                  <p className="mt-1 text-sm text-muted">{scenario.status}</p>
                </div>
                <Activity className="h-4 w-4 shrink-0 text-accent" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-panel-strong">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${scenario.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
