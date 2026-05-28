"use client";

import { useRef, useState } from "react";
import { Database, Download, KeyRound, Upload } from "lucide-react";
import { settingsGroups } from "@/lib/mock-data";
import { createLocalBackup, parseLocalBackup, restoreLocalBackup } from "@/lib/sync/local-backup";

function createBackupFileName() {
  return `learn-english-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function SettingsClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");

  function handleExport() {
    const payload = createLocalBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createBackupFileName();
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${Object.keys(payload.records).length} 组本地学习数据。`);
  }

  async function handleImport(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const payload = parseLocalBackup(await file.text());
      const restoredCount = restoreLocalBackup(payload);
      setMessage(`已导入 ${restoredCount} 组本地学习数据，刷新页面后生效。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <p className="text-sm font-medium text-accent">设置</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">学习和系统配置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          这里管理学习目标、AI 和语音、云同步与离线，以及当前阶段的数据迁移。
        </p>
        {message ? (
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            {message}
          </p>
        ) : null}
      </section>

      <section className="grid gap-5">
        {settingsGroups.map((group) => (
          <article key={group.title} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{group.description}</p>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {group.items.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium text-accent">{item.value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">数据策略</h2>
              <p className="mt-1 text-sm text-muted">个人学习数据优先可导出、可迁移。</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["材料", "词句", "复习记录", "练习反馈"].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-muted"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={handleExport}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              <Download className="h-4 w-4" />
              导出数据
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
            >
              <Upload className="h-4 w-4 text-accent" />
              导入数据
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">本地开发提示</h2>
              <p className="mt-1 text-sm text-muted">密钥放在 `.env`，仓库只保留 `.env.example`。</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-white p-4">
            <p className="text-sm font-semibold text-foreground">可迁移数据</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              导出的 JSON 会包含当前浏览器里以 `learn-english.` 开头的本地学习数据。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
