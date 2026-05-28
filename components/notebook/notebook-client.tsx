"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookMarked,
  Filter,
  RotateCcw,
  Search,
  Sparkles
} from "lucide-react";
import {
  getSeedLearningItems,
  getSeedReviewCards,
  loadLearningItems,
  loadReviewCards
} from "@/lib/review/review-store";
import { isCardDue } from "@/lib/review/review-store";
import type { LearningItemRecord, ReviewCardRecord } from "@/lib/review/types";

const filters = ["全部", "到期", "新卡", "句子", "短语"];

function getReviewState(item: LearningItemRecord, cards: ReviewCardRecord[]) {
  const card = cards.find((reviewCard) => reviewCard.learningItemId === item.id);

  if (!card) {
    return {
      label: "未生成",
      tone: "border-border bg-white text-muted"
    };
  }

  if (isCardDue(card)) {
    return {
      label: "到期",
      tone: "border-amber-200 bg-amber-50 text-amber-700"
    };
  }

  if (card.status === "new") {
    return {
      label: "新卡",
      tone: "border-sky-200 bg-sky-50 text-sky-700"
    };
  }

  return {
    label: "已安排",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };
}

function getTypeLabel(type: LearningItemRecord["type"]) {
  const labels: Record<LearningItemRecord["type"], string> = {
    word: "单词",
    phrase: "短语",
    sentence: "句子",
    pattern: "句型",
    error: "错误"
  };

  return labels[type];
}

export function NotebookClient() {
  const [items, setItems] = useState<LearningItemRecord[]>(() => getSeedLearningItems());
  const [cards, setCards] = useState<ReviewCardRecord[]>(() => getSeedReviewCards());
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setItems(loadLearningItems());
      setCards(loadReviewCards());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dueCount = cards.filter((card) => isCardDue(card)).length;
  const newCount = cards.filter((card) => card.status === "new").length;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const reviewState = getReviewState(item, cards);
      const matchesQuery =
        !normalizedQuery ||
        [item.text, item.meaningZh, item.meaningEn, item.sourceMaterialTitle, item.contextText]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesFilter =
        activeFilter === "全部" ||
        (activeFilter === "到期" && reviewState.label === "到期") ||
        (activeFilter === "新卡" && reviewState.label === "新卡") ||
        (activeFilter === "句子" && item.type === "sentence") ||
        (activeFilter === "短语" && item.type === "phrase");

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, cards, items, query]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">词句本</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">个人英语资产库</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                这里沉淀你从真实材料中保存的词、短语、句子和错误表达。后续 AI 解释、复习和输出训练都会围绕它展开。
              </p>
            </div>
            <Link
              href="/review"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              <RotateCcw className="h-4 w-4" />
              去复习
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                placeholder="搜索词句、来源材料或上下文"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Filter className="h-4 w-4 text-accent" />
              {filteredItems.length} 条
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`min-h-9 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  activeFilter === filter
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-white text-muted hover:bg-panel-strong"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">词句概览</h2>
            <BookMarked className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{items.length}</p>
              <p className="mt-1 text-xs text-muted">总词句</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{dueCount}</p>
              <p className="mt-1 text-xs text-muted">到期</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{newCount}</p>
              <p className="mt-1 text-xs text-muted">新卡</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
            现在先支持查看和搜索。下一步会继续加编辑、删除、归档和按材料筛选。
          </p>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {filteredItems.map((item) => {
          const reviewState = getReviewState(item, cards);
          const card = cards.find((reviewCard) => reviewCard.learningItemId === item.id);

          return (
            <article key={item.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${reviewState.tone}`}>
                      {reviewState.label}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold leading-7 text-foreground">{item.text}</h2>
                </div>
                <Sparkles className="h-5 w-5 shrink-0 text-accent" />
              </div>

              {item.meaningZh ? (
                <p className="mt-3 text-sm font-medium text-foreground">{item.meaningZh}</p>
              ) : null}
              {item.meaningEn ? (
                <p className="mt-2 text-sm leading-6 text-muted">{item.meaningEn}</p>
              ) : null}

              <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                <p className="text-xs font-medium text-muted">上下文</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{item.contextText}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">来源：{item.sourceMaterialTitle}</p>
                {card ? (
                  <Link
                    href="/review"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
                  >
                    查看复习卡
                    <ArrowRight className="h-4 w-4 text-accent" />
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {filteredItems.length === 0 ? (
        <section className="rounded-lg border border-border bg-panel p-5 text-center shadow-sm">
          <p className="text-sm text-muted">没有匹配的词句。可以回到学习页保存当前句。</p>
          <Link
            href="/study"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            去学习
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : null}
    </main>
  );
}
