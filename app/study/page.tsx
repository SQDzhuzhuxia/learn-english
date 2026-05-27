import { BookmarkPlus, ChevronLeft, ChevronRight, Languages, Play, Repeat2, Volume2 } from "lucide-react";
import { studySegments } from "@/lib/mock-data";

export default function StudyPage() {
  const current = studySegments[0];

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">精读精听</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">A Visit to the Doctor</h1>
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

        <div className="mt-5 space-y-3">
          {studySegments.map((segment) => (
            <article
              key={segment.id}
              className={`rounded-lg border p-4 ${
                segment.id === current.id
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-white"
              }`}
            >
              <p className="text-base leading-8 text-foreground">{segment.text}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{segment.translation}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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
            保存句子
          </button>
        </div>
      </section>

      <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">AI 解释</h2>
          <Languages className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-4 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-foreground">句子意思</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              这句话是在预约医生时说明症状和诉求，可以直接用于电话或前台沟通。
            </p>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">重点表达</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
              <li>make an appointment：预约</li>
              <li>sore throat：嗓子疼</li>
              <li>since yesterday：从昨天开始</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">自然说法</h3>
            <p className="mt-2 rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground">
              I would like to make an appointment with a doctor.
            </p>
          </section>
        </div>
      </aside>
    </main>
  );
}
