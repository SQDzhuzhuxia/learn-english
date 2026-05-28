"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkPlus,
  Bot,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Languages,
  Loader2,
  Mic,
  Play,
  Repeat2,
  RotateCw,
  Sparkles,
  Volume2
} from "lucide-react";
import { aiExplanation } from "@/lib/mock-data";
import { recordStudyActivity } from "@/lib/analytics/progress-store";
import {
  findMaterialById,
  getCurrentMaterialId,
  getSeedMaterials,
  loadMaterials,
  setCurrentMaterialId,
  updateMaterialProgress
} from "@/lib/content/material-store";
import { saveExpressionAsReviewCard, saveSegmentAsReviewCard } from "@/lib/review/review-store";
import type { StudyMaterialRecord } from "@/lib/content/types";
import type { AiSegmentExplanation } from "@/lib/ai/types";

const AI_EXPLANATION_CACHE_KEY = "learn-english.ai-segment-explanations.v1";

type AiExplanationState = {
  status: "idle" | "loading" | "success" | "error";
  explanation?: AiSegmentExplanation;
  message?: string;
};

type SavableExpression = {
  text: string;
  meaning: string;
  example: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readAiExplanationCache() {
  if (!canUseLocalStorage()) {
    return {};
  }

  const raw = window.localStorage.getItem(AI_EXPLANATION_CACHE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, AiSegmentExplanation>;
  } catch {
    window.localStorage.removeItem(AI_EXPLANATION_CACHE_KEY);
    return {};
  }
}

function getCachedAiExplanation(cacheKey: string) {
  return readAiExplanationCache()[cacheKey];
}

function setCachedAiExplanation(cacheKey: string, explanation: AiSegmentExplanation) {
  if (!canUseLocalStorage()) {
    return;
  }

  const cache = readAiExplanationCache();
  cache[cacheKey] = explanation;
  window.localStorage.setItem(AI_EXPLANATION_CACHE_KEY, JSON.stringify(cache));
}

function resolveInitialMaterial(materialId?: string) {
  const seedMaterials = getSeedMaterials();
  const fallbackId = materialId ?? seedMaterials[0]?.id;
  return fallbackId
    ? seedMaterials.find((material) => material.id === fallbackId)
    : undefined;
}

export function MaterialStudyClient({ materialId }: { materialId?: string }) {
  const [material, setMaterial] = useState<StudyMaterialRecord | undefined>(() =>
    resolveInitialMaterial(materialId)
  );
  const [currentOrder, setCurrentOrder] = useState(
    () => resolveInitialMaterial(materialId)?.currentSegmentOrder ?? 1
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [aiState, setAiState] = useState<AiExplanationState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      const fallbackId = materialId ?? getCurrentMaterialId() ?? loadMaterials()[0]?.id;
      const loaded = fallbackId ? findMaterialById(fallbackId) : undefined;

      if (!cancelled && loaded) {
        setMaterial(loaded);
        setCurrentOrder(loaded.currentSegmentOrder);
        setCurrentMaterialId(loaded.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const current = useMemo(() => {
    return material?.segments.find((segment) => segment.order === currentOrder) ?? material?.segments[0];
  }, [currentOrder, material]);

  const aiCacheKey = material && current ? `${material.id}:${current.id}` : "";

  const savableExpressions = useMemo<SavableExpression[]>(() => {
    if (!material || !current) {
      return [];
    }

    if (material.source === "seed") {
      return aiExplanation.expressions;
    }

    if (aiState.explanation?.keyExpressions.length) {
      return aiState.explanation.keyExpressions.map((expression) => ({
        text: expression.text,
        meaning: expression.meaningZh,
        example: expression.example
      }));
    }

    return material.keyExpressions.map((expression) => ({
      text: expression,
      meaning: "生成 AI 解释后会补充中文意思",
      example: current.text
    }));
  }, [aiState.explanation, current, material]);

  useEffect(() => {
    setSaveMessage("");

    if (!material || !current || material.source === "seed") {
      setAiState({ status: "idle" });
      return;
    }

    const cached = getCachedAiExplanation(`${material.id}:${current.id}`);

    if (cached) {
      setAiState({ status: "success", explanation: cached, message: "已读取本地 AI 解释缓存。" });
    } else {
      setAiState({ status: "idle" });
    }
  }, [current, material]);

  function moveTo(order: number) {
    if (!material) {
      return;
    }

    const nextOrder = Math.min(Math.max(order, 1), Math.max(1, material.segments.length));
    const updated = updateMaterialProgress(material.id, nextOrder);
    setCurrentOrder(nextOrder);

    if (updated) {
      setMaterial(updated);
    }
  }

  function handleSaveCurrentSentence() {
    if (!material || !current) {
      return;
    }

    const result = saveSegmentAsReviewCard(material, current);
    setSaveMessage(result.created ? "已保存到词句本，并生成复习卡。" : "这句话已经在复习队列里。");
  }

  function handleSaveExpression(expression: SavableExpression) {
    if (!material || !current) {
      return;
    }

    const result = saveExpressionAsReviewCard(material, current, {
      text: expression.text,
      meaningZh: expression.meaning,
      example: expression.example
    });

    setSaveMessage(result.created ? "已保存表达，并生成复习卡。" : "这个表达已经在复习队列里。");
  }

  async function handleGenerateAiExplanation() {
    if (!material || !current) {
      return;
    }

    setAiState((previous) => ({
      status: "loading",
      explanation: previous.explanation,
      message: "正在为当前句生成解释..."
    }));

    try {
      const response = await fetch("/api/ai/explain-segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          materialTitle: material.title,
          materialType: material.type,
          level: material.level,
          sentence: current.text,
          contextText: material.contentText
        })
      });

      const payload = (await response.json()) as {
        explanation?: AiSegmentExplanation;
        error?: string;
      };

      if (!response.ok || !payload.explanation) {
        throw new Error(payload.error ?? "AI 解释生成失败。");
      }

      setCachedAiExplanation(aiCacheKey, payload.explanation);
      recordStudyActivity({
        type: "ai",
        label: `AI 解释：${current.text}`,
        minutes: 1,
        materialId: material.id,
        materialTitle: material.title
      });
      setAiState({
        status: "success",
        explanation: payload.explanation,
        message:
          payload.explanation.source === "model"
            ? `已由 ${payload.explanation.provider} 生成解释。`
            : "当前使用本地降级解释，配置 API 后会自动调用模型。"
      });
    } catch (error) {
      setAiState((previous) => ({
        status: "error",
        explanation: previous.explanation,
        message: error instanceof Error ? error.message : "AI 解释生成失败。"
      }));
    }
  }

  if (!material || !current) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">学习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">没有找到材料</h1>
          <p className="mt-3 text-sm leading-6 text-muted">请先回到材料库选择或导入一篇文本。</p>
          <Link
            href="/library"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            <ArrowLeft className="h-4 w-4" />
            回到材料库
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <section className="flex flex-col gap-5">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                材料库
              </Link>
              <p className="mt-4 text-sm font-medium text-accent">
                {material.type} · {material.inputType}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">{material.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                当前第 {currentOrder} / {material.segments.length} 句，约 {material.minutes} 分钟。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">难度</p>
                <p className="mt-1 font-semibold text-foreground">{material.level}</p>
              </div>
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">进度</p>
                <p className="mt-1 font-semibold text-foreground">{material.progress}%</p>
              </div>
              <div className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted">来源</p>
                <p className="mt-1 font-semibold text-foreground">
                  {material.source === "user" ? "导入" : "内置"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full bg-panel-strong">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${material.progress}%` }}
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
              <button
                onClick={() => moveTo(currentOrder - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong"
                aria-label="上一句"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-strong" aria-label="播放">
                <Play className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveTo(currentOrder + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-panel-strong"
                aria-label="下一句"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-accent bg-accent-soft p-5">
            <p className="text-xl font-semibold leading-9 text-foreground">{current.text}</p>
            {current.translation ? (
              <p className="mt-3 text-sm leading-6 text-muted">{current.translation}</p>
            ) : null}
            {current.note ? (
              <p className="mt-3 text-sm leading-6 text-muted">{current.note}</p>
            ) : aiState.explanation ? (
              <p className="mt-3 text-sm leading-6 text-muted">{aiState.explanation.meaningZh}</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">
                用户导入文本可以点击右侧生成 AI 解释；未配置 API 时会先给出本地降级解释。
              </p>
            )}
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
            <button
              onClick={handleSaveCurrentSentence}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong"
            >
              <BookmarkPlus className="h-4 w-4 text-accent" />
              保存
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Mic className="h-4 w-4 text-accent" />
              跟读
            </button>
          </div>

          {saveMessage ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {saveMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">逐句列表</h2>
            <Headphones className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {material.segments.map((segment) => (
              <button
                key={segment.id}
                onClick={() => moveTo(segment.order)}
                className={`block w-full rounded-lg border p-4 text-left ${
                  segment.order === currentOrder
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-white hover:bg-panel-strong"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted">Sentence {segment.order}</p>
                    <p className="mt-2 text-base leading-7 text-foreground">{segment.text}</p>
                    {segment.translation ? (
                      <p className="mt-2 text-sm leading-6 text-muted">{segment.translation}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                    {segment.familiarity}
                  </span>
                </div>
              </button>
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
            {material.source === "seed" ? aiExplanation.sentence : current.text}
          </p>

          {material.source === "seed" ? (
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
          ) : (
            <div className="mt-4 space-y-4">
              <button
                onClick={handleGenerateAiExplanation}
                disabled={aiState.status === "loading"}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {aiState.status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : aiState.explanation ? (
                  <RotateCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiState.explanation ? "重新生成解释" : "生成当前句解释"}
              </button>

              {aiState.message ? (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
                    aiState.status === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-800"
                  }`}
                >
                  {aiState.message}
                </p>
              ) : null}

              {aiState.explanation ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-muted">
                    <Bot className="h-4 w-4 text-accent" />
                    {aiState.explanation.source === "model"
                      ? `模型解释 · ${aiState.explanation.provider}`
                      : `本地降级 · ${aiState.explanation.provider}`}
                  </div>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">句子意思</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{aiState.explanation.meaningZh}</p>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">结构拆解</h3>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                      {aiState.explanation.structure.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">中文母语者易错点</h3>
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                      {aiState.explanation.commonMistake}
                    </p>
                  </section>
                </>
              ) : (
                <p className="rounded-lg border border-border bg-white p-3 text-sm leading-6 text-muted">
                  这篇是你导入的材料。点击生成后，系统会按“中文解释、结构拆解、易错点、重点表达”的格式给当前句做学习说明。
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">可保存表达</h2>
          <div className="mt-4 space-y-3">
            {savableExpressions.map((expression) => (
              <div key={expression.text} className="rounded-lg border border-border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-foreground">{expression.text}</p>
                  <button
                    onClick={() => handleSaveExpression(expression)}
                    className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 text-xs font-semibold text-foreground hover:bg-panel-strong"
                    aria-label={`保存表达 ${expression.text}`}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5 text-accent" />
                    保存
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted">{expression.meaning}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{expression.example}</p>
              </div>
            ))}
          </div>
          {saveMessage ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {saveMessage}
            </p>
          ) : null}
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
            {material.source === "seed"
              ? aiExplanation.shadowingTip
              : aiState.explanation?.shadowingTip ??
                "用户导入材料已能学习和保存进度；生成 AI 解释后会自动补充跟读建议和重点表达。"}
          </p>
          <Link
            href="/review"
            onClick={handleSaveCurrentSentence}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            保存并生成复习卡
          </Link>
        </section>
      </aside>
    </main>
  );
}
