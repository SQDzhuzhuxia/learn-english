import Link from "next/link";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Languages,
  Mic,
  Play,
  Repeat2,
  Volume2
} from "lucide-react";
import { aiExplanation, studyMaterial, studySegments } from "@/lib/mock-data";

export default function StudyPage() {
  const current = studySegments.find((segment) => segment.status === "current") ?? studySegments[0];

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <section className="flex flex-col gap-5">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">{studyMaterial.subtitle}</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">{studyMaterial.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                当前第 {studyMaterial.currentSegment} / {studyMaterial.totalSegments} 句，剩余约 {studyMaterial.estimatedMinutesLeft} 分钟。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">难度</p>
                <p className="mt-1 font-semibold text-foreground">{studyMaterial.level}</p>
              </div>
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">进度</p>
                <p className="mt-1 font-semibold text-foreground">{studyMaterial.progress}%</p>
              </div>
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">已知词</p>
                <p className="mt-1 font-semibold text-foreground">{studyMaterial.knownWords}%</p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full bg-panel-strong">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${studyMaterial.progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">当前句</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">先听懂，再保存</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong" aria-label="上一句">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-strong" aria-label="播放">
                <Play className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong" aria-label="下一句">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-accent bg-accent-soft p-5">
            <p className="text-xl font-semibold leading-9 text-foreground">{current.text}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{current.translation}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{current.note}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Volume2 className="h-4 w-4 text-accent" />
              慢速
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Repeat2 className="h-4 w-4 text-accent" />
              循环
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <BookmarkPlus className="h-4 w-4 text-accent" />
              保存
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Mic className="h-4 w-4 text-accent" />
              跟读
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">逐句列表</h2>
            <Headphones className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {studySegments.map((segment) => (
              <article
                key={segment.id}
                className={`rounded-lg border p-4 ${
                  segment.status === "current"
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted">Sentence {segment.order}</p>
                    <p className="mt-2 text-base leading-7 text-foreground">{segment.text}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{segment.translation}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                    {segment.familiarity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-5">
        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">AI 解释</h2>
            <Languages className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-4 rounded-lg border border-border bg-panel-strong p-3 text-sm leading-6 text-foreground">
            {aiExplanation.sentence}
          </p>

          <div className="mt-4 space-y-4">
            <section>
              <h3 className="text-sm font-semibold text-foreground">句子意思</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{aiExplanation.meaning}</p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">结构拆解</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                {aiExplanation.structure.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">中文母语者易错点</h3>
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                {aiExplanation.commonMistake}
              </p>
            </section>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">可保存表达</h2>
          <div className="mt-4 space-y-3">
            {aiExplanation.expressions.map((expression) => (
              <div key={expression.text} className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                <p className="mt-1 text-sm text-muted">{expression.meaning}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{expression.example}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
            {aiExplanation.shadowingTip}
          </p>
          <Link
            href="/review"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            保存并生成复习卡
          </Link>
        </section>
      </aside>
    </main>
  );
}
