import Link from "next/link";
import { ArrowRight, CheckCircle2, RotateCcw, Volume2 } from "lucide-react";
import { reviewCards, reviewRatings, reviewSummary } from "@/lib/mock-data";

export default function ReviewPage() {
  const activeCard = reviewCards[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">复习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">今日到期词句</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{reviewSummary.focus}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{reviewSummary.dueToday}</p>
              <p className="mt-1 text-xs text-muted">今日到期</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{reviewSummary.newCards}</p>
              <p className="mt-1 text-xs text-muted">新生成</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{reviewSummary.expectedMinutes}</p>
              <p className="mt-1 text-xs text-muted">预计分钟</p>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">复习原则</h2>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            只复习来自真实材料的词句。看到英文能理解，听到能反应，最后再尝试看中文说英文。
          </p>
          <Link
            href="/study"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
          >
            回到学习材料
            <ArrowRight className="h-4 w-4 text-accent" />
          </Link>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                {activeCard.cardType}
              </span>
              <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                {activeCard.difficulty}
              </span>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong" aria-label="播放音频">
              <Volume2 className="h-4 w-4 text-accent" />
            </button>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-panel-strong p-5">
            <p className="text-2xl font-semibold leading-10 text-foreground">{activeCard.front}</p>
            <p className="mt-4 text-sm leading-6 text-muted">{activeCard.example}</p>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-white p-4">
            <p className="text-sm font-medium text-muted">答案</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{activeCard.back}</p>
            <p className="mt-2 text-sm text-muted">来源：{activeCard.source}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            {reviewRatings.map((rating) => (
              <button
                key={rating.id}
                className={`min-h-16 rounded-lg border px-3 py-2 text-sm font-semibold ${rating.tone}`}
              >
                <span className="block">{rating.label}</span>
                <span className="mt-1 block text-xs font-medium opacity-80">{rating.next}</span>
              </button>
            ))}
          </div>
        </article>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">复习队列</h2>
            <RotateCcw className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {reviewCards.map((card, index) => (
              <div
                key={card.id}
                className={`rounded-lg border p-3 ${
                  index === 0 ? "border-accent bg-accent-soft" : "border-border bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{card.front}</p>
                    <p className="mt-1 text-xs text-muted">{card.cardType} · {card.source}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-xs text-muted">
                    {card.nextReview}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
