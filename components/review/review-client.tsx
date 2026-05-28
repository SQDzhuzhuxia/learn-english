"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, Volume2 } from "lucide-react";
import { reviewRatings } from "@/lib/mock-data";
import {
  getSeedReviewCards,
  isCardDue,
  loadReviewCards,
  reviewCard
} from "@/lib/review/review-store";
import type { ReviewCardRecord } from "@/lib/review/types";
import type { ReviewRating } from "@/lib/review/scheduler";

function formatDueLabel(card: ReviewCardRecord) {
  const dueAt = new Date(card.dueAt);
  const now = new Date();
  const diffMs = dueAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "已到期";
  }

  const diffHours = Math.ceil(diffMs / (60 * 60 * 1000));

  if (diffHours < 24) {
    return `${diffHours} 小时后`;
  }

  return `${Math.ceil(diffHours / 24)} 天后`;
}

export function ReviewClient() {
  const [cards, setCards] = useState<ReviewCardRecord[]>(() => getSeedReviewCards());
  const [activeCardId, setActiveCardId] = useState(cards[0]?.id ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const loaded = loadReviewCards();
      setCards(loaded);
      setActiveCardId((current) => current || loaded[0]?.id || "");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dueCards = useMemo(() => cards.filter((card) => isCardDue(card)), [cards]);
  const activeCard =
    cards.find((card) => card.id === activeCardId) ?? dueCards[0] ?? cards[0];
  const newCards = cards.filter((card) => card.status === "new").length;

  function handleRate(cardId: string, rating: ReviewRating) {
    const updated = reviewCard(cardId, rating);
    const nextCards = loadReviewCards();
    setCards(nextCards);

    const nextDue = nextCards.find((card) => isCardDue(card) && card.id !== cardId);
    setActiveCardId(nextDue?.id ?? nextCards[0]?.id ?? "");

    if (updated) {
      setMessage(`已记录：${formatDueLabel(updated)}复习。`);
    }
  }

  if (!activeCard) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">复习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">暂无复习卡</h1>
          <p className="mt-3 text-sm leading-6 text-muted">先去学习页保存句子，就会自动生成复习卡。</p>
          <Link
            href="/study"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            回到学习材料
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">复习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">今日到期词句</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            所有卡片都来自你学习过的真实材料。评分后会自动安排下一次复习。
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{dueCards.length}</p>
              <p className="mt-1 text-xs text-muted">今日到期</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{newCards}</p>
              <p className="mt-1 text-xs text-muted">新卡</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{cards.length}</p>
              <p className="mt-1 text-xs text-muted">总卡片</p>
            </div>
          </div>

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">复习原则</h2>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            看到英文能理解，听到能反应，最后再尝试看中文说英文。忘了也没关系，系统会安排更近的复习。
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
                {formatDueLabel(activeCard)}
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
                onClick={() => handleRate(activeCard.id, rating.id as ReviewRating)}
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
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveCardId(card.id)}
                className={`block w-full rounded-lg border p-3 text-left ${
                  card.id === activeCard.id ? "border-accent bg-accent-soft" : "border-border bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{card.front}</p>
                    <p className="mt-1 text-xs text-muted">{card.cardType} · {card.source}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-xs text-muted">
                    {formatDueLabel(card)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
