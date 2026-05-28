"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  FilePlus2,
  Filter,
  Headphones,
  Search,
  Upload
} from "lucide-react";
import { materialFilters } from "@/lib/mock-data";
import {
  getSeedMaterials,
  loadMaterials,
  setCurrentMaterialId
} from "@/lib/content/material-store";
import type { StudyMaterialRecord } from "@/lib/content/types";

export function MaterialLibraryClient() {
  const [materials, setMaterials] = useState<StudyMaterialRecord[]>(() => getSeedMaterials());
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("合适");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setMaterials(loadMaterials());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesQuery =
        !normalizedQuery ||
        [material.title, material.summary, material.type, ...material.keyExpressions]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesFilter =
        activeFilter === "全部" ||
        activeFilter === "合适" ||
        material.type === activeFilter ||
        material.priority === activeFilter;

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, materials, query]);

  const recommended = materials[0];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">材料库</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">可理解输入材料中心</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                先选择略高于当前水平的材料。现在已经可以导入文本并保存到浏览器本地。
              </p>
            </div>
            <Link
              href="/library/import"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              <FilePlus2 className="h-4 w-4" />
              导入材料
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                placeholder="搜索材料、场景或关键词"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
              <Filter className="h-4 w-4 text-accent" />
              {filteredMaterials.length} 篇
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {materialFilters.map((filter) => (
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
            <h2 className="text-lg font-semibold text-foreground">继续学习</h2>
            <Headphones className="h-5 w-5 text-accent" />
          </div>
          {recommended ? (
            <>
              <p className="mt-3 text-sm leading-6 text-muted">{recommended.summary}</p>
              <div className="mt-4 rounded-lg border border-border bg-panel-strong p-4">
                <p className="text-sm font-semibold text-foreground">{recommended.title}</p>
                <p className="mt-2 text-xs text-muted">
                  {recommended.type} · {recommended.level} · {recommended.minutes} 分钟
                </p>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${recommended.progress}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/study/${recommended.id}`}
                onClick={() => setCurrentMaterialId(recommended.id)}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
              >
                继续学习
                <ArrowRight className="h-4 w-4 text-accent" />
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">暂无材料，先导入一篇文本。</p>
          )}
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredMaterials.map((material) => (
          <article key={material.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                  {material.priority}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{material.title}</h2>
              </div>
              <ClipboardList className="h-5 w-5 shrink-0 text-accent" />
            </div>

            <p className="mt-3 text-sm leading-6 text-muted">{material.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                {material.type}
              </span>
              <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                {material.inputType}
              </span>
              <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                {material.level}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted">时间</p>
                <p className="mt-1 font-semibold text-foreground">{material.minutes}m</p>
              </div>
              <div>
                <p className="text-xs text-muted">句子</p>
                <p className="mt-1 font-semibold text-foreground">{material.segments.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted">状态</p>
                <p className="mt-1 font-semibold text-foreground">{material.status}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>学习进度</span>
                <span>{material.progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-panel-strong">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${material.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {material.keyExpressions.slice(0, 2).map((expression) => (
                <p key={expression} className="rounded-lg bg-panel-strong px-3 py-2 text-sm text-muted">
                  {expression}
                </p>
              ))}
            </div>

            <Link
              href={`/study/${material.id}`}
              onClick={() => setCurrentMaterialId(material.id)}
              className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
            >
              打开材料
              <ArrowRight className="h-4 w-4 text-accent" />
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">导入入口</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">粘贴一段英文文本，自动分句并保存</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              现在先支持纯文本导入。后续会继续加入字幕、URL、音频转写和云同步。
            </p>
          </div>
          <Link
            href="/library/import"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
          >
            <Upload className="h-4 w-4 text-accent" />
            准备导入
          </Link>
        </div>
      </section>
    </main>
  );
}
