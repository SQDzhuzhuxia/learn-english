import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, PenLine, Play } from "lucide-react";
import { practiceModes, todayPractice, writingPrompts } from "@/lib/mock-data";

export default function PracticePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">练习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">输出能力训练台</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            输出不追求多，而是紧跟今天已经听懂读懂的材料：先跟读，再复述，最后写一两句。
          </p>

          <div className="mt-5 rounded-lg border border-accent bg-accent-soft p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">今日推荐</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{todayPractice.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{todayPractice.target}</p>
              </div>
              <Link
                href="/study"
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
              >
                <Play className="h-4 w-4" />
                开始跟读
              </Link>
            </div>
            <p className="mt-4 rounded-lg border border-border bg-white p-3 text-base font-semibold leading-7 text-foreground">
              {todayPractice.prompt}
            </p>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">跟读步骤</h2>
            <Mic className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {todayPractice.steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <article key={mode.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                  {mode.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{mode.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
              <div className="mt-4 rounded-lg bg-panel-strong p-3">
                <p className="text-sm font-semibold text-foreground">{mode.todayTask}</p>
                <p className="mt-1 text-xs text-muted">
                  {mode.estimatedMinutes} 分钟 · {mode.output}
                </p>
              </div>
              <button className="mt-5 min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong">
                进入
              </button>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">短写作任务</h2>
            <PenLine className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {writingPrompts.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                    {item.level}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{item.prompt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">输出后会沉淀什么</h2>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["录音转写", "AI 纠错", "复习卡"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">{item}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  先作为静态流程展示，后续接入真实语音、写作和 AI 反馈。
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/review"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
          >
            查看会进入复习的内容
            <ArrowRight className="h-4 w-4 text-accent" />
          </Link>
        </div>
      </section>
    </main>
  );
}
