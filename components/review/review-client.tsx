"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, RotateCcw, Volume2 } from "lucide-react";
import { reviewRatings } from "@/lib/mock-data";
import {
  getSeedReviewCards,
  getSeedLearningItems,
  isCardDue,
  loadLearningItems,
  loadReviewLogs,
  loadReviewCards,
  reviewCard
} from "@/lib/review/review-store";
import {
  filterReviewCards,
  type ReviewCardTypeFilter,
  type ReviewQueueFilter
} from "@/lib/review/review-filters";
import { summarizeReviewLogs } from "@/lib/review/review-diagnostics";
import { getReviewCardDetail } from "@/lib/review/review-card-detail";
import { getReviewQueueStats } from "@/lib/review/review-stats";
import type { LearningItemRecord, ReviewCardRecord, ReviewLogRecord } from "@/lib/review/types";
import type { ReviewRating } from "@/lib/review/scheduler";

const cardTypeLabels: Record<ReviewCardRecord["cardType"], string> = {
  recognition: "识别",
  listening: "听力",
  spelling: "拼写",
  speaking: "口语",
  production: "输出"
};

const queueFilterOptions: Array<{ id: ReviewQueueFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "due", label: "到期" },
  { id: "new", label: "新卡" },
  { id: "future", label: "未来" },
  { id: "attention", label: "回炉" }
];

const cardTypeFilterOptions: Array<{ id: ReviewCardTypeFilter; label: string }> = [
  { id: "all", label: "全部类型" },
  { id: "recognition", label: "识别" },
  { id: "listening", label: "听力" },
  { id: "spelling", label: "拼写" },
  { id: "speaking", label: "口语" },
  { id: "production", label: "输出" }
];

const cardTypeInstructions: Record<ReviewCardRecord["cardType"], string> = {
  recognition: "看到英文，先说出中文意思。",
  listening: "先播放，再尝试写出或说出听到的英文。",
  spelling: "根据提示拼写英文表达。",
  speaking: "先跟读，再自己说一遍。",
  production: "看到中文，尝试说出自然英文。"
};

const ratingLabels: Record<ReviewRating, string> = {
  again: "忘了",
  hard: "困难",
  good: "一般",
  easy: "简单"
};

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

function formatReviewDateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ReviewClient() {
  const [items, setItems] = useState<LearningItemRecord[]>(() => getSeedLearningItems());
  const [cards, setCards] = useState<ReviewCardRecord[]>(() => getSeedReviewCards());
  const [logs, setLogs] = useState<ReviewLogRecord[]>([]);
  const [activeCardId, setActiveCardId] = useState(cards[0]?.id ?? "");
  const [queueFilter, setQueueFilter] = useState<ReviewQueueFilter>("all");
  const [cardTypeFilter, setCardTypeFilter] = useState<ReviewCardTypeFilter>("all");
  const [message, setMessage] = useState("");
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const loaded = loadReviewCards();
      const requestedCardId =
        typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("card");
      setItems(loadLearningItems());
      setCards(loaded);
      setLogs(loadReviewLogs());
      setActiveCardId(
        (current) =>
          requestedCardId && loaded.some((card) => card.id === requestedCardId && card.status !== "suspended")
            ? requestedCardId
            : current || loaded.find((card) => card.status !== "suspended")?.id || ""
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCards = useMemo(() => cards.filter((card) => card.status !== "suspended"), [cards]);
  const dueCards = useMemo(() => visibleCards.filter((card) => isCardDue(card)), [visibleCards]);
  const filteredCards = useMemo(
    () => filterReviewCards(cards, { queue: queueFilter, cardType: cardTypeFilter, logs }),
    [cards, cardTypeFilter, logs, queueFilter]
  );
  const activeCard =
    filteredCards.find((card) => card.id === activeCardId) ??
    filteredCards.find((card) => isCardDue(card)) ??
    filteredCards[0];
  const queueStats = useMemo(() => getReviewQueueStats(cards), [cards]);
  const diagnostics = useMemo(() => summarizeReviewLogs(logs), [logs]);
  const activeCardDetail = useMemo(
    () => (activeCard ? getReviewCardDetail(activeCard, items, logs) : undefined),
    [activeCard, items, logs]
  );
  const typeStats = Object.entries(queueStats.byType).filter(([, count]) => count > 0) as Array<
    [ReviewCardRecord["cardType"], number]
  >;
  const maxDailyReviews = Math.max(1, ...diagnostics.dailyTrend.map((day) => day.reviews));

  function handleRate(cardId: string, rating: ReviewRating) {
    const updated = reviewCard(cardId, rating);
    const nextCards = loadReviewCards();
    const nextLogs = loadReviewLogs();
    const nextFilteredCards = filterReviewCards(nextCards, {
      queue: queueFilter,
      cardType: cardTypeFilter,
      logs: nextLogs
    });
    setCards(nextCards);
    setLogs(nextLogs);

    const nextDue = nextFilteredCards.find((card) => isCardDue(card) && card.id !== cardId);
    const nextQueued = nextFilteredCards.find((card) => card.id !== cardId) ?? nextFilteredCards[0];
    setActiveCardId(nextDue?.id ?? nextQueued?.id ?? "");
    setIsAnswerVisible(false);

    if (updated) {
      setMessage(`已记录：${formatDueLabel(updated)}复习。`);
    }
  }

  function handleSpeakCard(card: ReviewCardRecord) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setMessage("当前浏览器不支持本地朗读。");
      return;
    }

    const textToSpeak = card.cardType === "recognition" ? card.front : card.back;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  if (visibleCards.length === 0) {
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
              <p className="text-2xl font-semibold text-foreground">{queueStats.new}</p>
              <p className="mt-1 text-xs text-muted">新卡</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{queueStats.total}</p>
              <p className="mt-1 text-xs text-muted">总卡片</p>
            </div>
          </div>

          {typeStats.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {typeStats.map(([cardType, count]) => (
                <span
                  key={cardType}
                  className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted"
                >
                  {cardTypeLabels[cardType]} {count}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted">队列筛选</p>
              <div className="mt-2 grid grid-cols-5 gap-1 rounded-lg border border-border bg-white p-1">
                {queueFilterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setQueueFilter(option.id);
                      setIsAnswerVisible(false);
                    }}
                    className={`min-h-9 rounded-md px-2 text-xs font-semibold ${
                      queueFilter === option.id
                        ? "bg-accent text-white"
                        : "text-muted hover:bg-panel-strong"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted">卡片类型</p>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-1 sm:grid-cols-6">
                {cardTypeFilterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setCardTypeFilter(option.id);
                      setIsAnswerVisible(false);
                    }}
                    disabled={option.id !== "all" && queueStats.byType[option.id] === 0}
                    className={`min-h-9 rounded-md px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${
                      cardTypeFilter === option.id
                        ? "bg-accent text-white"
                        : "text-muted hover:bg-panel-strong"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">复习诊断</h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="border-l border-border pl-3">
                <p className="text-lg font-semibold text-foreground">{diagnostics.recentReviews}</p>
                <p className="mt-1 text-xs text-muted">近 7 天</p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-lg font-semibold text-foreground">{diagnostics.successRate}%</p>
                <p className="mt-1 text-xs text-muted">顺利率</p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-lg font-semibold text-foreground">{diagnostics.attentionCount}</p>
                <p className="mt-1 text-xs text-muted">需回炉</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{diagnostics.message}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted">
              {Object.entries(diagnostics.ratingCounts).map(([rating, count]) => (
                <div key={rating} className="flex items-center justify-between gap-2">
                  <span>{ratingLabels[rating as ReviewRating]}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {diagnostics.dailyTrend.map((day) => (
                <div key={day.day} className="grid grid-cols-[36px_1fr_24px] items-center gap-2 text-xs">
                  <span className="text-muted">{day.day}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-panel-strong">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(6, (day.reviews / maxDailyReviews) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-medium text-foreground">{day.reviews}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {activeCard ? (
          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                  {cardTypeLabels[activeCard.cardType]}
                </span>
                <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                  {formatDueLabel(activeCard)}
                </span>
              </div>
              <button
                onClick={() => handleSpeakCard(activeCard)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong"
                aria-label="播放当前卡片"
              >
                <Volume2 className="h-4 w-4 text-accent" />
              </button>
            </div>

            <div className="mt-8 rounded-lg border border-border bg-panel-strong p-5">
              <p className="mb-3 text-sm font-medium text-accent">
                {cardTypeInstructions[activeCard.cardType]}
              </p>
              <p className="text-2xl font-semibold leading-10 text-foreground">{activeCard.front}</p>
              <p className="mt-4 text-sm leading-6 text-muted">{activeCard.example}</p>
            </div>

            {isAnswerVisible ? (
              <div className="mt-5 rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-medium text-muted">答案</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{activeCard.back}</p>
                <p className="mt-2 text-sm text-muted">来源：{activeCard.source}</p>
              </div>
            ) : (
              <button
                onClick={() => setIsAnswerVisible(true)}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
              >
                <Eye className="h-4 w-4 text-accent" />
                显示答案
              </button>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {reviewRatings.map((rating) => (
                <button
                  key={rating.id}
                  disabled={!isAnswerVisible}
                  onClick={() => handleRate(activeCard.id, rating.id as ReviewRating)}
                  className={`min-h-16 rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${rating.tone}`}
                >
                  <span className="block">{rating.label}</span>
                  <span className="mt-1 block text-xs font-medium opacity-80">{rating.next}</span>
                </button>
              ))}
            </div>

            {activeCardDetail ? (
              <div className="mt-5 border-t border-border pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">卡片详情</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {activeCardDetail.item?.text ?? "未找到关联词句"}
                    </p>
                  </div>
                  <Link
                    href="/notebook"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
                  >
                    管理词句
                    <ArrowRight className="h-4 w-4 text-accent" />
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted">来源材料</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {activeCardDetail.item?.sourceMaterialTitle ?? activeCard.source}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">复习次数</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {activeCardDetail.reviewCount} 次
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">最近评分</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {activeCardDetail.latestRating
                        ? ratingLabels[activeCardDetail.latestRating]
                        : "暂无"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">当前状态</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {activeCardDetail.statusLabel}
                      {activeCardDetail.needsAttention ? " · 回炉" : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-l-2 border-accent pl-3">
                  <p className="text-xs font-medium text-accent">
                    {activeCardDetail.needsAttention ? "回炉建议" : "练习建议"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">{activeCardDetail.suggestion}</p>
                  {activeCardDetail.sourceStudyHref ? (
                    <Link
                      href={activeCardDetail.sourceStudyHref}
                      className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
                    >
                      回到原材料
                      <ArrowRight className="h-4 w-4 text-accent" />
                    </Link>
                  ) : null}
                </div>
                {activeCardDetail.recentLogs.length > 0 ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">最近复习记录</p>
                    <div className="mt-3 space-y-2">
                      {activeCardDetail.recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-3 text-sm text-muted"
                        >
                          <span>{formatReviewDateLabel(log.reviewedAt)}</span>
                          <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-foreground">
                            {ratingLabels[log.rating]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : (
          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <p className="text-sm font-medium text-accent">当前筛选</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">暂无匹配复习卡</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              这个筛选范围里暂时没有卡片，可以切回全部队列继续复习。
            </p>
            <button
              onClick={() => {
                setQueueFilter("all");
                setCardTypeFilter("all");
                setIsAnswerVisible(false);
              }}
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              查看全部队列
            </button>
          </article>
        )}

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">复习队列</h2>
            <RotateCcw className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {filteredCards.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  setActiveCardId(card.id);
                  setIsAnswerVisible(false);
                }}
                className={`block w-full rounded-lg border p-3 text-left ${
                  card.id === activeCard.id ? "border-accent bg-accent-soft" : "border-border bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{card.front}</p>
                    <p className="mt-1 text-xs text-muted">
                      {cardTypeLabels[card.cardType]} · {card.source}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-xs text-muted">
                    {formatDueLabel(card)}
                  </span>
                </div>
              </button>
            ))}
            {filteredCards.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-white px-3 py-4 text-sm leading-6 text-muted">
                当前筛选没有复习卡。
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
