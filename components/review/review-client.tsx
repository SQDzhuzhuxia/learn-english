"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, RotateCcw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { reviewRatings } from "@/lib/mock-data";
import {
  getSeedReviewCards,
  getSeedLearningItems,
  isCardDue,
  loadLearningItems,
  loadReviewLogs,
  loadReviewCards,
  resetReviewCard,
  restoreReviewCard,
  restoreReviewCards,
  reviewCard,
  suspendReviewCard,
  suspendReviewCards
} from "@/lib/review/review-store";
import {
  filterReviewCards,
  type ReviewCardTypeFilter,
  type ReviewQueueFilter
} from "@/lib/review/review-filters";
import { summarizeReviewLogs } from "@/lib/review/review-diagnostics";
import { getReviewCardDetail } from "@/lib/review/review-card-detail";
import { getReviewQueueStats } from "@/lib/review/review-stats";
import { speakEnglishText } from "@/lib/speech/speech-synthesis";
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
  { id: "attention", label: "回炉" },
  { id: "paused", label: "暂停" }
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
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
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
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const selectedCards = useMemo(
    () => cards.filter((card) => selectedCardIdSet.has(card.id)),
    [cards, selectedCardIdSet]
  );
  const selectedActiveCards = selectedCards.filter((card) => card.status !== "suspended");
  const selectedPausedCards = selectedCards.filter((card) => card.status === "suspended");
  const allFilteredCardsSelected =
    filteredCards.length > 0 && filteredCards.every((card) => selectedCardIdSet.has(card.id));
  const activeCard =
    filteredCards.find((card) => card.id === activeCardId) ??
    filteredCards.find((card) => isCardDue(card)) ??
    filteredCards[0];
  const queueStats = useMemo(() => getReviewQueueStats(cards), [cards]);
  const diagnostics = useMemo(() => summarizeReviewLogs(logs), [logs]);
  const activeCardDetail = useMemo(
    () => (activeCard ? getReviewCardDetail(activeCard, items, logs, cards) : undefined),
    [activeCard, cards, items, logs]
  );
  const typeStats = Object.entries(queueStats.byType).filter(([, count]) => count > 0) as Array<
    [ReviewCardRecord["cardType"], number]
  >;
  const maxDailyReviews = Math.max(1, ...diagnostics.dailyTrend.map((day) => day.reviews));

  function syncReviewState(nextCards: ReviewCardRecord[], nextLogs: ReviewLogRecord[]) {
    const nextFilteredCards = filterReviewCards(nextCards, {
      queue: queueFilter,
      cardType: cardTypeFilter,
      logs: nextLogs
    });

    setCards(nextCards);
    setLogs(nextLogs);
    setActiveCardId((current) => {
      const currentCard = nextFilteredCards.find((card) => card.id === current);
      return currentCard?.id ?? nextFilteredCards.find((card) => isCardDue(card))?.id ?? nextFilteredCards[0]?.id ?? "";
    });
    setIsAnswerVisible(false);
  }

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

  function handleSuspendCard(cardId: string) {
    const updated = suspendReviewCard(cardId);
    const nextCards = loadReviewCards();
    const nextLogs = loadReviewLogs();
    const nextFilteredCards = filterReviewCards(nextCards, {
      queue: queueFilter,
      cardType: cardTypeFilter,
      logs: nextLogs
    });

    setCards(nextCards);
    setLogs(nextLogs);
    setIsAnswerVisible(false);
    setActiveCardId(nextFilteredCards.find((card) => card.id !== cardId)?.id ?? nextFilteredCards[0]?.id ?? "");

    if (updated) {
      setMessage("已暂停这张复习卡，可在“暂停”队列中恢复。");
    }
  }

  function handleToggleSelectCard(cardId: string) {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]
    );
  }

  function handleToggleSelectFilteredCards() {
    const filteredCardIds = filteredCards.map((card) => card.id);
    const filteredCardIdSet = new Set(filteredCardIds);

    setSelectedCardIds((current) => {
      const currentSet = new Set(current);
      const isAllSelected =
        filteredCardIds.length > 0 && filteredCardIds.every((cardId) => currentSet.has(cardId));

      if (isAllSelected) {
        return current.filter((cardId) => !filteredCardIdSet.has(cardId));
      }

      return Array.from(new Set([...current, ...filteredCardIds]));
    });
  }

  function handleClearCardSelection() {
    setSelectedCardIds([]);
  }

  function handleSwitchToGroupCard(card: ReviewCardRecord) {
    setActiveCardId(card.id);
    setQueueFilter(card.status === "suspended" ? "paused" : "all");
    setCardTypeFilter((current) => (current === "all" || current === card.cardType ? current : "all"));
    setIsAnswerVisible(false);
  }

  function handleBulkSuspendCards() {
    const targetIds = selectedActiveCards.map((card) => card.id);

    if (targetIds.length === 0) {
      setMessage("当前选择里没有可暂停的复习卡。");
      return;
    }

    const result = suspendReviewCards(targetIds);
    syncReviewState(loadReviewCards(), loadReviewLogs());
    setSelectedCardIds([]);
    setMessage(`已批量暂停 ${result.suspendedCards} 张复习卡。`);
  }

  function handleBulkRestoreCards() {
    const targetIds = selectedPausedCards.map((card) => card.id);

    if (targetIds.length === 0) {
      setMessage("当前选择里没有可恢复的暂停卡。");
      return;
    }

    const result = restoreReviewCards(targetIds);
    syncReviewState(loadReviewCards(), loadReviewLogs());
    setSelectedCardIds([]);
    setMessage(`已批量恢复 ${result.restoredCards} 张复习卡。`);
  }

  function handleRestoreCard(cardId: string) {
    const updated = restoreReviewCard(cardId);
    const nextCards = loadReviewCards();
    const nextLogs = loadReviewLogs();

    setCards(nextCards);
    setLogs(nextLogs);
    setActiveCardId(cardId);
    setIsAnswerVisible(false);

    if (updated) {
      setMessage("已恢复这张复习卡。");
    }
  }

  function handleResetCard(cardId: string) {
    const confirmed = window.confirm("重置后这张卡会变成新卡，并清除它的复习记录，确定继续吗？");

    if (!confirmed) {
      return;
    }

    const result = resetReviewCard(cardId);
    const nextCards = loadReviewCards();
    const nextLogs = loadReviewLogs();

    setCards(nextCards);
    setLogs(nextLogs);
    setActiveCardId(cardId);
    setIsAnswerVisible(false);

    if (result.card) {
      setMessage(`已重置为新卡，并清除 ${result.deletedLogs} 条复习记录。`);
    }
  }

  async function handleSpeakCard(card: ReviewCardRecord) {
    const textToSpeak = card.cardType === "recognition" ? card.front : card.back;
    setMessage("正在准备英文朗读...");
    const result = await speakEnglishText(textToSpeak, { rate: 0.78 });
    setMessage(result.ok ? `${result.message} 请听完后再看答案。` : result.message);
  }

  if (cards.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <Badge variant="soft" className="w-fit">复习</Badge>
            <CardTitle className="text-2xl">暂无复习卡</CardTitle>
            <CardDescription>先去学习页保存句子，就会自动生成复习卡。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/study">
                回到学习材料
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="soft" className="w-fit">复习</Badge>
                <CardTitle className="mt-3 text-2xl">今日到期词句</CardTitle>
                <CardDescription className="mt-2 max-w-3xl">
                  所有卡片都来自你学习过的真实材料。评分后会自动安排下一次复习。
                </CardDescription>
              </div>
              <Badge variant={dueCards.length > 0 ? "warning" : "success"} className="w-fit">
                {dueCards.length > 0 ? "需要复习" : "今日清爽"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["今日到期", dueCards.length],
                ["新卡", queueStats.new],
                ["总卡片", queueStats.total],
                ["已暂停", queueStats.suspended]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-white p-4">
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{label}</p>
                </div>
              ))}
            </div>

            {typeStats.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {typeStats.map(([cardType, count]) => (
                  <Badge key={cardType} variant="outline">
                    {cardTypeLabels[cardType]} {count}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted">队列筛选</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-1 sm:grid-cols-6">
                  {queueFilterOptions.map((option) => (
                    <Button
                      key={option.id}
                      onClick={() => {
                        setQueueFilter(option.id);
                        setIsAnswerVisible(false);
                      }}
                      variant={queueFilter === option.id ? "default" : "ghost"}
                      size="sm"
                      className="px-2"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">卡片类型</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-1 sm:grid-cols-6">
                  {cardTypeFilterOptions.map((option) => (
                    <Button
                      key={option.id}
                      onClick={() => {
                        setCardTypeFilter(option.id);
                        setIsAnswerVisible(false);
                      }}
                      disabled={option.id !== "all" && queueStats.byType[option.id] === 0}
                      variant={cardTypeFilter === option.id ? "default" : "ghost"}
                      size="sm"
                      className="px-2 disabled:opacity-35"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {message ? (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>复习原则</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-foreground" />
            </div>
            <CardDescription>
              看到英文能理解，听到能反应，最后再尝试看中文说英文。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/study">
                回到学习材料
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Separator className="my-5" />
            <h3 className="text-sm font-semibold text-foreground">复习诊断</h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ["近 7 天", diagnostics.recentReviews],
                ["顺利率", `${diagnostics.successRate}%`],
                ["需回炉", diagnostics.attentionCount]
              ].map(([label, value]) => (
                <div key={label} className="border-l border-border pl-3">
                  <p className="text-lg font-semibold text-foreground">{value}</p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
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
                  <Progress value={Math.max(6, (day.reviews / maxDailyReviews) * 100)} />
                  <span className="text-right font-medium text-foreground">{day.reviews}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {activeCard ? (
          <Card>
            <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">
                  {cardTypeLabels[activeCard.cardType]}
                </Badge>
                <Badge variant={activeCard.status === "suspended" ? "warning" : "outline"}>
                  {formatDueLabel(activeCard)}
                </Badge>
              </div>
              <Button
                onClick={() => void handleSpeakCard(activeCard)}
                variant="outline"
                size="icon"
                aria-label="播放当前卡片"
              >
                <Volume2 className="h-4 w-4 text-foreground" />
              </Button>
            </div>

            <div className="mt-8 rounded-lg border border-border bg-panel-strong p-5">
              <p className="mb-3 text-sm font-medium text-foreground">
                {cardTypeInstructions[activeCard.cardType]}
              </p>
              <p className="break-words text-2xl font-semibold leading-10 text-foreground">{activeCard.front}</p>
              <p className="mt-4 text-sm leading-6 text-muted">{activeCard.example}</p>
            </div>

            {activeCard.status === "suspended" ? (
              <div className="mt-5 rounded-lg border border-border bg-panel-strong p-4">
                <p className="text-sm font-semibold text-foreground">这张卡已暂停</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  暂停卡不会进入日常复习队列。恢复后会按照原来的间隔重新进入复习。
                </p>
                <Button
                  onClick={() => handleRestoreCard(activeCard.id)}
                  className="mt-4"
                >
                  恢复这张卡
                </Button>
              </div>
            ) : isAnswerVisible ? (
              <div className="mt-5 rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-medium text-muted">答案</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{activeCard.back}</p>
                <p className="mt-2 text-sm text-muted">来源：{activeCard.source}</p>
              </div>
            ) : (
              <Button
                onClick={() => setIsAnswerVisible(true)}
                variant="outline"
                size="lg"
                className="mt-5 w-full"
              >
                <Eye className="h-4 w-4 text-foreground" />
                显示答案
              </Button>
            )}

            {activeCard.status !== "suspended" ? (
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
            ) : null}

            {activeCardDetail ? (
              <div className="mt-5">
                <Separator className="mb-5" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">卡片详情</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {activeCardDetail.item?.text ?? "未找到关联词句"}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/notebook">
                      管理词句
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
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
                {activeCardDetail.groupCards.length > 1 ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">同组卡片</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeCardDetail.groupCards.map((groupCard) => {
                        const isCurrentCard = groupCard.id === activeCard.id;

                        return (
                          <Button
                            key={groupCard.id}
                            onClick={() => handleSwitchToGroupCard(groupCard)}
                            aria-current={isCurrentCard ? "true" : undefined}
                            variant={isCurrentCard ? "soft" : "outline"}
                          >
                            <span>{cardTypeLabels[groupCard.cardType]}</span>
                            <span className="text-xs font-medium text-muted">
                              {isCurrentCard
                                ? "当前"
                                : groupCard.status === "suspended"
                                  ? "已暂停"
                                  : formatDueLabel(groupCard)}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 border-l-2 border-foreground/20 pl-3">
                  <p className="text-xs font-medium text-foreground">
                    {activeCardDetail.needsAttention ? "回炉建议" : "练习建议"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">{activeCardDetail.suggestion}</p>
                  {activeCardDetail.sourceStudyHref ? (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link href={activeCardDetail.sourceStudyHref}>
                        回到原材料
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
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
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {activeCard.status === "suspended" ? (
                    <Button onClick={() => handleRestoreCard(activeCard.id)}>
                      恢复复习卡
                    </Button>
                  ) : (
                    <Button onClick={() => handleSuspendCard(activeCard.id)} variant="outline">
                      暂停复习卡
                    </Button>
                  )}
                  <Button onClick={() => handleResetCard(activeCard.id)} variant="warning">
                    重置为新卡
                  </Button>
                </div>
              </div>
            ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <Badge variant="soft" className="w-fit">当前筛选</Badge>
              <CardTitle>暂无匹配复习卡</CardTitle>
              <CardDescription>
                这个筛选范围里暂时没有卡片，可以切回全部队列继续复习。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setQueueFilter("all");
                  setCardTypeFilter("all");
                  setIsAnswerVisible(false);
                }}
              >
                查看全部队列
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>复习队列</CardTitle>
              <RotateCcw className="h-5 w-5 text-foreground" />
            </div>
            <CardDescription>当前筛选下的卡片和批量管理。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">已选择 {selectedCards.length} 张</p>
              {selectedCards.length > 0 ? (
                <Button onClick={handleClearCardSelection} variant="ghost" size="sm">
                  清空
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                onClick={handleToggleSelectFilteredCards}
                disabled={filteredCards.length === 0}
                variant="outline"
                size="sm"
              >
                {allFilteredCardsSelected ? "取消当前队列" : "选择当前队列"}
              </Button>
              <Button
                onClick={handleBulkSuspendCards}
                disabled={selectedActiveCards.length === 0}
                variant="outline"
                size="sm"
              >
                批量暂停
              </Button>
              <Button
                onClick={handleBulkRestoreCards}
                disabled={selectedPausedCards.length === 0}
                size="sm"
              >
                批量恢复
              </Button>
              <p className="flex min-h-9 items-center text-xs leading-5 text-muted">
                可整理暂时不练的卡片。
              </p>
            </div>
            <Separator className="my-4" />
          <div className="space-y-3">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  card.id === activeCard?.id ? "border-foreground/15 bg-panel-strong" : "border-border bg-white"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center pt-0.5">
                    <span className="sr-only">选择复习卡</span>
                    <Checkbox
                      checked={selectedCardIdSet.has(card.id)}
                      onCheckedChange={() => handleToggleSelectCard(card.id)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setActiveCardId(card.id);
                      setIsAnswerVisible(false);
                    }}
                    className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{card.front}</span>
                      <span className="mt-1 block text-xs text-muted">
                        {cardTypeLabels[card.cardType]} · {card.source}
                        {card.status === "suspended" ? " · 已暂停" : ""}
                      </span>
                    </span>
                    <Badge variant={card.status === "suspended" ? "warning" : "outline"} className="shrink-0">
                      {formatDueLabel(card)}
                    </Badge>
                  </button>
                </div>
              </div>
            ))}
            {filteredCards.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-white px-3 py-4 text-sm leading-6 text-muted">
                当前筛选没有复习卡。
              </p>
            ) : null}
          </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
