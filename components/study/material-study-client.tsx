"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Languages,
  Mic,
  Play,
  Repeat2,
  Volume2
} from "lucide-react";
import { aiExplanation } from "@/lib/mock-data";
import {
  findMaterialById,
  getCurrentMaterialId,
  getSeedMaterials,
  loadMaterials,
  setCurrentMaterialId,
  updateMaterialProgress
} from "@/lib/content/material-store";
import type { StudyMaterialRecord } from "@/lib/content/types";

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
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">
                用户导入文本暂时没有翻译和 AI 解释，后续会接入模型自动生成。
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
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <BookmarkPlus className="h-4 w-4 text-accent" />
              保存
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Mic className="h-4 w-4 text-accent" />
              跟读
            </button>
          </div>
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
            <p className="mt-4 rounded-lg border border-border bg-white p-3 text-sm leading-6 text-muted">
              这篇是你导入的材料。下一步 Sprint 会把 AI 解释接进来，自动生成中文解释、重点词句和复习卡。
            </p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">可保存表达</h2>
          <div className="mt-4 space-y-3">
            {(material.source === "seed"
              ? aiExplanation.expressions
              : material.keyExpressions.map((expression) => ({
                  text: expression,
                  meaning: "待 AI 解释",
                  example: current.text
                }))
            ).map((expression) => (
              <div key={expression.text} className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                <p className="mt-1 text-sm text-muted">{expression.meaning}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{expression.example}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
            {material.source === "seed"
              ? aiExplanation.shadowingTip
              : "用户导入材料已能学习和保存进度；AI 提取表达会在后续 Sprint 接入。"}
          </p>
          <Link
            href="/review"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            保存并生成复习卡
          </Link>
        </section>
      </aside>
    </main>
  );
}
