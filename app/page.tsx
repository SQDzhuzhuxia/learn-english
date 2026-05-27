import {
  BookOpenText,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Headphones,
  Mic,
  Play,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { dailyPlan, progressStats, reviewCards } from "@/lib/mock-data";

export default function TodayPage() {
  const dueCards = reviewCards.filter((card) => card.dueToday);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">今日计划</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {dailyPlan.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {dailyPlan.focus}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm font-medium text-foreground">
              <Clock3 className="h-4 w-4 text-accent" />
              {dailyPlan.durationMinutes} 分钟
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dailyPlan.steps.map((step) => (
              <article key={step.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-muted">{step.minutes} 分钟</span>
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong">
              <Play className="h-4 w-4" />
              开始今日学习
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-panel-strong">
              <RefreshCcw className="h-4 w-4 text-accent" />
              调整为 60 分钟
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">今日复习</h2>
            <CalendarCheck className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {dueCards.length} 张词句卡到期，优先复习来自真实材料的句子。
          </p>
          <div className="mt-4 space-y-3">
            {dueCards.map((card) => (
              <div key={card.id} className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-medium text-foreground">{card.front}</p>
                <p className="mt-1 text-xs text-muted">{card.source}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-accent">当前材料</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                A Visit to the Doctor
              </h2>
            </div>
            <BookOpenText className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 rounded-lg border border-border bg-panel-strong p-4">
            <p className="text-base leading-8 text-foreground">
              I have had a sore throat since yesterday, and I would like to make an appointment with a doctor.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              从“预约看医生”开始积累美国生活高频表达，今天先掌握 appointment、sore throat、since yesterday。
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Headphones className="h-4 w-4 text-accent" />
              精听
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Mic className="h-4 w-4 text-accent" />
              跟读
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Sparkles className="h-4 w-4 text-accent" />
              AI 解释
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">本周进度</h2>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {progressStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-white p-3">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
