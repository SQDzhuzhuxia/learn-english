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
  archiveLearningItems,
  deleteLearningItem,
  deleteLearningItems,
  getSeedLearningItems,
  getSeedReviewCards,
  loadLearningItems,
  loadReviewCards,
  restoreLearningItem,
  restoreLearningItems,
  updateLearningItem
} from "@/lib/review/review-store";
import { isCardDue } from "@/lib/review/review-store";
import { createReviewCardHref } from "@/lib/review/review-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
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

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );
  const selectedActiveItems = selectedItems.filter((item) => item.status !== "archived");
  const selectedArchivedItems = selectedItems.filter((item) => item.status === "archived");
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedItemIds.includes(item.id));

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
    setSelectedItemIds((current) => current.filter((id) => id !== itemId));
    handleCancelEdit();
    setMessage("已删除词句和关联复习卡。");
  }

  function handleToggleSelect(itemId: string) {
    setSelectedItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  function handleToggleSelectFiltered() {
    const filteredIds = filteredItems.map((item) => item.id);

    setSelectedItemIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  function handleBulkArchive() {
    const result = archiveLearningItems(selectedActiveItems.map((item) => item.id));
    refreshNotebook();
    setSelectedItemIds([]);
    setMessage(`已批量归档 ${result.archivedItems} 个词句，暂停 ${result.suspendedCards} 张复习卡。`);
  }

  function handleBulkRestore() {
    const result = restoreLearningItems(selectedArchivedItems.map((item) => item.id));
    refreshNotebook();
    setSelectedItemIds([]);
    setActiveFilter("全部");
    setMessage(`已批量恢复 ${result.restoredItems} 个词句，恢复 ${result.restoredCards} 张复习卡。`);
  }

  function handleBulkDelete() {
    const confirmed = window.confirm("批量删除后会移除关联复习卡和复习日志，确定删除吗？");

    if (!confirmed) {
      return;
    }

    const result = deleteLearningItems(selectedItems.map((item) => item.id));
    refreshNotebook();
    setSelectedItemIds([]);
    handleCancelEdit();
    setMessage(`已批量删除 ${result.deletedItems} 个词句和 ${result.deletedCards} 张复习卡。`);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="soft">词句本</Badge>
              <h1 className="mt-3 text-2xl font-semibold text-foreground">个人英语资产库</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                这里沉淀你从真实材料中保存的词、短语、句子和错误表达。后续 AI 解释、复习和输出训练都会围绕它展开。
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/review">
                <RotateCcw className="h-4 w-4" />
                去复习
              </Link>
            </Button>
          </div>

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring">
              <Search className="h-4 w-4 text-muted" />
              <Input
                className="min-h-0 border-0 bg-transparent px-0 py-0 focus:border-0 focus:ring-0"
                placeholder="搜索词句、来源材料或上下文"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Button variant="outline" className="min-h-11">
              <Filter className="h-4 w-4 text-accent" />
              {filteredItems.length} 条
            </Button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "soft" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className="shrink-0"
              >
                {filter}
              </Button>
            ))}
          </div>

          {filteredItems.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Separator className="lg:hidden" />
              <p className="text-sm text-muted">
                已选择 <span className="font-semibold text-foreground">{selectedItems.length}</span> 条
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleToggleSelectFiltered}
                >
                  <Check className="h-4 w-4 text-accent" />
                  {allFilteredSelected ? "取消当前结果" : "选择当前结果"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedItemIds([])}
                  disabled={selectedItems.length === 0}
                >
                  <CircleX className="h-4 w-4 text-muted" />
                  清空选择
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={selectedActiveItems.length === 0}
                >
                  <Archive className="h-4 w-4 text-muted" />
                  批量归档
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkRestore}
                  disabled={selectedArchivedItems.length === 0}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  批量恢复
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={selectedItems.length === 0}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  批量删除
                </Button>
              </div>
            </div>
          ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">词句概览</CardTitle>
            <BookMarked className="h-5 w-5 text-accent" />
          </div>
          <CardDescription>复习队列会随着保存、归档、恢复自动同步。</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-2 gap-2">
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
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {filteredItems.map((item) => {
          const reviewState = getReviewState(item, cards);
          const card = cards.find((reviewCard) => reviewCard.learningItemId === item.id);

          return (
            <Card key={item.id}>
              <CardContent className="pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                    <Checkbox
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => handleToggleSelect(item.id)}
                      aria-label={`选择词句：${item.text}`}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="soft">
                        {getTypeLabel(item.type)}
                      </Badge>
                      <Badge variant="outline" className={reviewState.tone}>
                        {reviewState.label}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold leading-7 text-foreground">{item.text}</h2>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleStartEdit(item)}
                    aria-label="编辑词句"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {item.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRestore(item.id)}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      aria-label="恢复词句"
                      title="恢复"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleArchive(item.id)}
                      aria-label="归档词句"
                      title="归档"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    aria-label="删除词句"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingItemId === item.id && editForm ? (
                <div className="mt-5 space-y-3 rounded-lg border border-border bg-panel-strong p-4">
                  <Label className="block">
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
                  </Label>
                  <Label className="block">
                    词句
                    <Textarea
                      className="mt-2 min-h-24"
                      value={editForm.text}
                      onChange={(event) => setEditForm({ ...editForm, text: event.target.value })}
                    />
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Label className="block">
                      中文解释
                      <Input
                        className="mt-2"
                        value={editForm.meaningZh}
                        onChange={(event) => setEditForm({ ...editForm, meaningZh: event.target.value })}
                      />
                    </Label>
                    <Label className="block">
                      英文解释
                      <Input
                        className="mt-2"
                        value={editForm.meaningEn}
                        onChange={(event) => setEditForm({ ...editForm, meaningEn: event.target.value })}
                      />
                    </Label>
                  </div>
                  <Label className="block">
                    上下文
                    <Textarea
                      className="mt-2 min-h-24"
                      value={editForm.contextText}
                      onChange={(event) => setEditForm({ ...editForm, contextText: event.target.value })}
                    />
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      <CircleX className="h-4 w-4 text-muted" />
                      取消
                    </Button>
                    <Button
                      onClick={() => handleSaveEdit(item.id)}
                    >
                      <Check className="h-4 w-4" />
                      保存
                    </Button>
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
                      <Button asChild variant="outline">
                        <Link href={createReviewCardHref(card.id)}>
                          查看复习卡
                          <ArrowRight className="h-4 w-4 text-accent" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted">没有匹配的词句。可以回到学习页保存当前句。</p>
            <Button asChild className="mt-4">
              <Link href="/study">
                去学习
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
