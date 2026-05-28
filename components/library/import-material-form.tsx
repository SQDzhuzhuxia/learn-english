"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, Sparkles } from "lucide-react";
import { addTextMaterial } from "@/lib/content/material-store";
import { splitTextIntoSegments } from "@/lib/content/split-text";

const defaultText =
  "I would like to make an appointment with a doctor. I have had a sore throat since yesterday. Do you have any openings this afternoon?";

export function ImportMaterialForm() {
  const router = useRouter();
  const [title, setTitle] = useState("My First Imported Text");
  const [type, setType] = useState("用户导入");
  const [level, setLevel] = useState("A1+");
  const [contentText, setContentText] = useState(defaultText);
  const [error, setError] = useState("");

  const segments = useMemo(() => splitTextIntoSegments(contentText), [contentText]);
  const wordCount = useMemo(
    () => contentText.trim().split(/\s+/).filter(Boolean).length,
    [contentText]
  );

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedText = contentText.trim();

    if (!trimmedTitle) {
      setError("请给材料起一个标题。");
      return;
    }

    if (trimmedText.length < 20 || segments.length === 0) {
      setError("请至少粘贴一段完整英文文本。");
      return;
    }

    const material = addTextMaterial({
      title: trimmedTitle,
      type,
      level,
      contentText: trimmedText
    });

    router.push(`/study/${material.id}`);
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">导入材料</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">粘贴英文文本</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Sprint 2 先支持文本导入：保存到本地浏览器，自动分句，然后进入学习页。
            </p>
          </div>
          <Link
            href="/library"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
          >
            <ArrowLeft className="h-4 w-4 text-accent" />
            返回材料库
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-foreground">标题</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-foreground">难度</span>
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option>A1</option>
              <option>A1+</option>
              <option>A2</option>
              <option>B1</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-foreground">类型</span>
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>用户导入</option>
              <option>美国生活</option>
              <option>职场</option>
              <option>自动化</option>
              <option>入籍</option>
            </select>
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-foreground">英文文本</span>
          <textarea
            className="mt-2 min-h-72 w-full rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground outline-none focus:border-accent"
            value={contentText}
            onChange={(event) => {
              setContentText(event.target.value);
              setError("");
            }}
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          onClick={handleSubmit}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong sm:w-auto"
        >
          <Save className="h-4 w-4" />
          保存并开始学习
        </button>
      </section>

      <aside className="flex flex-col gap-5">
        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">导入预览</h2>
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{segments.length}</p>
              <p className="mt-1 text-xs text-muted">自动分句</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{wordCount}</p>
              <p className="mt-1 text-xs text-muted">约词数</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">前 5 句</h2>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {segments.slice(0, 5).map((segment) => (
              <div key={segment.id} className="rounded-lg border border-border bg-white p-3">
                <p className="text-xs font-medium text-muted">Sentence {segment.order}</p>
                <p className="mt-1 text-sm leading-6 text-foreground">{segment.text}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
