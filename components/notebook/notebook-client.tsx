"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Archive,
  ArchiveRestore,
  BookMarked,
  Check,
  CircleX,
  Filter,
  Pencil,
  RotateCcw,
  Search,
  Trash2
} from "lucide-react";
import {
  archiveLearningItem,
  deleteLearningItem,
  getSeedLearningItems,
  getSeedReviewCards,
  loadLearningItems,
  loadReviewCards,
  restoreLearningItem,
  updateLearningItem
} from "@/lib/review/review-store";
import { isCardDue } from "@/lib/review/review-store";
import type { LearningItemRecord, ReviewCardRecord } from "@/lib/review/types";

const filters = ["全部", "到期", "新卡", "句子", "短语", "归档"];
const itemTypes: Array<{ label: string; value: LearningItemRecord["type"] }> = [
  { label: "单词", value: "word" },
  { label: "短语", value: "phrase" },
  { label: "句子", value: "sentence" },
  { label: "句型", value: "pattern" },
  { label: "错误", value: "error" }
];

type EditFormState = {
  type: LearningItemRecord["type"];
  text: string;
  meaningZh: string;
  meaningEn: string;
  contextText: string;
};

function getReviewState(item: LearningItemRecord, cards: ReviewCardRecord[]) {
  if (item.status === "archived") {
    return {
      label: "已归档",
      tone: "border-slate-200 bg-slate-50 text-slate-600"
    };
  }

  const card = cards.find((reviewCard) => reviewCard.learningItemId === item.id);

  if (!card || card.status === "suspended") {
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

function createEditForm(item: LearningItemRecord): EditFormState {
  return {
    type: item.type,
    text: item.text,
    meaningZh: item.meaningZh ?? "",
    meaningEn: item.meaningEn ?? "",
    contextText: item.contextText
  };
}

export function NotebookClient() {
  const [items, setItems] = useState<LearningItemRecord[]>(() => getSeedLearningItems());
  const [cards, setCards] = useState<ReviewCardRecord[]>(() => getSeedReviewCards());
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [editingItemId, setEditingItemId] = useState("");
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [message, setMessage] = useState("");

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

  const activeItemIds = new Set(
    items.filter((item) => item.status !== "archived").map((item) => item.id)
  );
  const activeCards = cards.filter(
    (card) => card.status !== "suspended" && activeItemIds.has(card.learningItemId)
  );
  const activeCount = activeItemIds.size;
  const archivedCount = items.filter((item) => item.status === "archived").length;
  const dueCount = activeCards.filter((card) => isCardDue(card)).length;
  const newCount = activeCards.filter((card) => card.status === "new").length;

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
        (activeFilter === "全部" && item.status !== "archived") ||
        (activeFilter === "到期" && item.status !== "archived" && reviewState.label === "到期") ||
        (activeFilter === "新卡" && item.status !== "archived" && reviewState.label === "新卡") ||
        (activeFilter === "句子" && item.status !== "archived" && item.type === "sentence") ||
        (activeFilter === "短语" && item.status !== "archived" && item.type === "phrase") ||
        (activeFilter === "归档" && item.status === "archived");

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, cards, items, query]);

  function refreshNotebook() {
    setItems(loadLearningItems());
    setCards(loadReviewCards());
  }

  function handleStartEdit(item: LearningItemRecord) {
    setEditingItemId(item.id);
    setEditForm(createEditForm(item));
    setMessage("");
  }

  function handleCancelEdit() {
    setEditingItemId("");
    setEditForm(null);
  }

  function handleSaveEdit(itemId: string) {
    if (!editForm) {
      return;
    }

    if (!editForm.text.trim() || !editForm.contextText.trim()) {
      setMessage("词句和上下文不能为空。");
      return;
    }

    updateLearningItem(itemId, {
      type: editForm.type,
      text: editForm.text.trim(),
      meaningZh: editForm.meaningZh.trim() || undefined,
      meaningEn: editForm.meaningEn.trim() || undefined,
      contextText: editForm.contextText.trim()
    });
    refreshNotebook();
    handleCancelEdit();
    setMessage("已保存词句修改。");
  }

  function handleArchive(itemId: string) {
    archiveLearningItem(itemId);
    refreshNotebook();
    setMessage("已归档，关联复习卡已暂停。");
  }

  function handleRestore(itemId: string) {
    restoreLearningItem(itemId);
    refreshNotebook();
    setActiveFilter("全部");
    setMessage("已恢复到词句本。");
  }

  function handleDelete(itemId: string) {
    const confirmed = window.confirm("删除后会移除关联复习卡和复习日志，确定删除吗？");

    if (!confirmed) {
      return;
    }

    deleteLearningItem(itemId);
    refreshNotebook();
    handleCancelEdit();
    setMessage("已删除词句和关联复习卡。");
  }

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

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
              <p className="mt-1 text-xs text-muted">活跃词句</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{dueCount}</p>
              <p className="mt-1 text-xs text-muted">到期</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{newCount}</p>
              <p className="mt-1 text-xs text-muted">新卡</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{archivedCount}</p>
              <p className="mt-1 text-xs text-muted">归档</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
            词句修改会同步更新关联复习卡；归档会暂停复习，恢复后会重新进入队列。
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
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-panel-strong hover:text-foreground"
                    aria-label="编辑词句"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {item.status === "archived" ? (
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      aria-label="恢复词句"
                      title="恢复"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-panel-strong hover:text-foreground"
                      aria-label="归档词句"
                      title="归档"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    aria-label="删除词句"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingItemId === item.id && editForm ? (
                <div className="mt-5 space-y-3 rounded-lg border border-border bg-panel-strong p-4">
                  <label className="block text-sm font-medium text-foreground">
                    类型
                    <select
                      className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none"
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm({ ...editForm, type: event.target.value as LearningItemRecord["type"] })
                      }
                    >
                      {itemTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    词句
                    <textarea
                      className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-foreground outline-none"
                      value={editForm.text}
                      onChange={(event) => setEditForm({ ...editForm, text: event.target.value })}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-foreground">
                      中文解释
                      <input
                        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none"
                        value={editForm.meaningZh}
                        onChange={(event) => setEditForm({ ...editForm, meaningZh: event.target.value })}
                      />
                    </label>
                    <label className="block text-sm font-medium text-foreground">
                      英文解释
                      <input
                        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none"
                        value={editForm.meaningEn}
                        onChange={(event) => setEditForm({ ...editForm, meaningEn: event.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-foreground">
                    上下文
                    <textarea
                      className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-foreground outline-none"
                      value={editForm.contextText}
                      onChange={(event) => setEditForm({ ...editForm, contextText: event.target.value })}
                    />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
                    >
                      <CircleX className="h-4 w-4 text-muted" />
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
                    >
                      <Check className="h-4 w-4" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                    {card && card.status !== "suspended" ? (
                      <Link
                        href="/review"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
                      >
                        查看复习卡
                        <ArrowRight className="h-4 w-4 text-accent" />
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
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
