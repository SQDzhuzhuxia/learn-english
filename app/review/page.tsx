import { RotateCcw, Volume2 } from "lucide-react";
import { reviewCards } from "@/lib/mock-data";

const ratings = ["忘了", "困难", "一般", "简单"];

export default function ReviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <p className="text-sm font-medium text-accent">复习</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">今日到期词句</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {reviewCards.filter((card) => card.dueToday).length} 张卡片来自最近学习的真实材料。
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
              句卡
            </span>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong" aria-label="播放音频">
              <Volume2 className="h-4 w-4 text-accent" />
            </button>
          </div>
          <p className="mt-8 text-2xl font-semibold leading-10 text-foreground">
            I would like to make an appointment.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted">
            我想预约。来自美国生活场景：看医生。
          </p>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ratings.map((rating) => (
              <button
                key={rating}
                className="min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
              >
                {rating}
              </button>
            ))}
          </div>
        </article>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">队列</h2>
            <RotateCcw className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {reviewCards.map((card) => (
              <div key={card.id} className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-medium text-foreground">{card.front}</p>
                <p className="mt-1 text-xs text-muted">{card.cardType}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
