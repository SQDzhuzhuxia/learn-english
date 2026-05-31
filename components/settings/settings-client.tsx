"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, Database, Download, KeyRound, Trash2, Upload } from "lucide-react";
import { CloudSyncPanel } from "@/components/settings/cloud-sync-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { settingsGroups } from "@/lib/mock-data";
import {
  createLocalBackup,
  createLocalSyncSnapshot,
  parseLocalBackup,
  restoreLocalBackup
} from "@/lib/sync/local-backup";
import { summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import { clearCachedTtsAudio } from "@/lib/speech/tts-audio-cache";
import { clearAiRequestQueue, loadAiRequestQueue } from "@/lib/ai/request-queue";

function createBackupFileName() {
  return `learn-english-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function createSyncSnapshotFileName() {
  return `learn-english-sync-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
}

function downloadJsonFile(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function SettingsClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [aiQueueCount, setAiQueueCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setAiQueueCount(loadAiRequestQueue().length);
    });
  }, []);

  function handleExport() {
    const payload = createLocalBackup();
    downloadJsonFile(createBackupFileName(), payload);
    setMessage(`已导出 ${Object.keys(payload.records).length} 组本地学习数据。`);
  }

  function handleCreateSyncSnapshot() {
    const snapshot = createLocalSyncSnapshot();
    const summary = summarizeSyncSnapshot(snapshot);
    downloadJsonFile(createSyncSnapshotFileName(), snapshot);
    setMessage(`已生成同步快照：${summary.recordCount} 组数据，${summary.totalBytes} bytes。`);
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

  async function handleClearTtsAudioCache() {
    const cleared = await clearCachedTtsAudio();
    setMessage(cleared ? "已清理本机离线朗读音频缓存。" : "当前浏览器没有可清理的离线朗读音频缓存。");
  }

  function handleClearAiRequestQueue() {
    const clearedCount = clearAiRequestQueue();
    setAiQueueCount(0);
    setMessage(
      clearedCount > 0
        ? `已清理 ${clearedCount} 条本机 AI 请求队列。`
        : "当前没有待处理的本机 AI 请求。"
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <Badge variant="soft" className="w-fit">设置</Badge>
          <CardTitle className="text-2xl">学习和系统配置</CardTitle>
          <CardDescription className="max-w-3xl">
            这里管理学习目标、AI 和语音、云同步与离线，以及当前阶段的数据迁移。
          </CardDescription>
        </CardHeader>
        {message ? (
          <CardContent>
            <p className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
              {message}
            </p>
          </CardContent>
        ) : null}
      </Card>

      <section className="grid gap-5">
        {settingsGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid gap-3 lg:grid-cols-3">
              {group.items.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium text-muted">{item.value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CloudSyncPanel />

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>数据策略</CardTitle>
                <CardDescription>个人学习数据优先可导出、可迁移。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {["材料", "词句", "复习记录", "练习反馈", "离线朗读音频缓存", `AI 请求队列 ${aiQueueCount} 条`].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-muted"
              >
                {item}
              </div>
            ))}
          </div>
          <Separator className="my-5" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Button onClick={handleExport}>
              <Download className="h-4 w-4" />
              导出数据
            </Button>
            <Button onClick={handleCreateSyncSnapshot} variant="outline">
              <Cloud className="h-4 w-4" />
              同步快照
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4" />
              导入数据
            </Button>
            <Button onClick={() => void handleClearTtsAudioCache()} variant="outline">
              <Trash2 className="h-4 w-4" />
              清理音频
            </Button>
            <Button onClick={handleClearAiRequestQueue} variant="outline">
              <Trash2 className="h-4 w-4" />
              清理队列
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>本地开发提示</CardTitle>
                <CardDescription>密钥放在 `.env`，仓库只保留 `.env.example`。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-sm font-semibold text-foreground">可迁移数据</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              导出的 JSON 会包含当前浏览器里以 `learn-english.` 开头的本地学习数据。
            </p>
          </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
