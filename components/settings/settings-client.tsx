"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Cloud, Database, Download, KeyRound, Mic, RotateCw, Trash2, Upload, Volume2 } from "lucide-react";
import { CloudSyncPanel } from "@/components/settings/cloud-sync-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToastMessage } from "@/components/ui/toast";
import type { LocalSpeechReadiness, SpeechReadinessStatus } from "@/lib/speech/server/local-speech-readiness";
import { settingsGroups } from "@/lib/mock-data";
import {
  createLocalBackup,
  createLocalSyncSnapshot,
  parseLocalBackup,
  restoreLocalBackup
} from "@/lib/sync/local-backup";
import { summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import { clearCachedTtsAudio } from "@/lib/speech/tts-audio-cache";
import { speakEnglishText } from "@/lib/speech/speech-synthesis";
import { clearAiRequestQueue, loadAiRequestQueue, retryQueuedAiRequests } from "@/lib/ai/request-queue";
import { clearAiResultInbox, loadAiResultInbox } from "@/lib/ai/result-inbox";

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

function getSpeechStatusLabel(status: SpeechReadinessStatus) {
  if (status === "local") {
    return "本地可用";
  }

  if (status === "cloud") {
    return "云端可用";
  }

  return "未配置";
}

const localTtsEnvTemplate = [
  "TTS_PROVIDER=local",
  "TTS_BASE_URL=http://127.0.0.1:8880/v1",
  "TTS_MODEL=local-tts",
  "TTS_ENDPOINT_PATH=/audio/speech",
  "TTS_VOICE=alloy",
  "TTS_FORMAT=mp3"
].join("\n");

export function SettingsClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [aiQueueCount, setAiQueueCount] = useState(0);
  const [aiResultCount, setAiResultCount] = useState(0);
  const [confirmClearAiResults, setConfirmClearAiResults] = useState(false);
  const [speechReadiness, setSpeechReadiness] = useState<LocalSpeechReadiness | null>(null);
  const [ttsPreviewText, setTtsPreviewText] = useState("I would like to make an appointment for Friday morning.");
  const [ttsPreviewVoice, setTtsPreviewVoice] = useState("alloy");
  const [ttsPreviewInstructions, setTtsPreviewInstructions] = useState("Speak clearly and slowly for a beginner English learner.");
  const [ttsPreviewMessage, setTtsPreviewMessage] = useState("");
  const [isTestingTts, setIsTestingTts] = useState(false);
  useToastMessage(message, { title: "设置" });
  useToastMessage(ttsPreviewMessage, { title: "TTS 试听" });

  useEffect(() => {
    queueMicrotask(() => {
      setAiQueueCount(loadAiRequestQueue().length);
      setAiResultCount(loadAiResultInbox().length);
    });

    void fetch("/api/speech/readiness")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: LocalSpeechReadiness | null) => {
        if (payload) {
          setSpeechReadiness(payload);
        }
      })
      .catch(() => {
        setSpeechReadiness(null);
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

  async function handleTestTtsPreview() {
    setIsTestingTts(true);
    setTtsPreviewMessage("正在请求 TTS 试听...");

    try {
      const result = await speakEnglishText(ttsPreviewText, {
        voice: ttsPreviewVoice,
        instructions: ttsPreviewInstructions,
        preferServer: true
      });

      setTtsPreviewMessage(result.message);
    } catch (error) {
      setTtsPreviewMessage(error instanceof Error ? error.message : "TTS 试听失败。");
    } finally {
      setIsTestingTts(false);
    }
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

  async function handleRetryAiRequestQueue() {
    const summary = await retryQueuedAiRequests({ limit: 10 });
    setAiQueueCount(summary.remaining);
    setAiResultCount(loadAiResultInbox().length);
    setConfirmClearAiResults(false);
    setMessage(
      summary.attempted > 0
        ? `已重试 ${summary.attempted} 条 AI 请求，成功 ${summary.completed} 条，失败 ${summary.failed} 条，剩余 ${summary.remaining} 条。`
        : `当前没有可自动回写的 AI 请求。剩余队列 ${summary.remaining} 条。`
    );
  }

  function handleClearAiResultInbox() {
    if (!confirmClearAiResults) {
      setConfirmClearAiResults(true);
      setMessage("再次点击“确认清理”才会清空 AI 结果收件箱。");
      return;
    }

    const clearedCount = clearAiResultInbox();
    setAiResultCount(0);
    setConfirmClearAiResults(false);
    setMessage(
      clearedCount > 0
        ? `已清理 ${clearedCount} 条本机 AI 结果收件箱记录。`
        : "当前没有可清理的 AI 结果。"
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
            {[
              "材料",
              "词句",
              "复习记录",
              "练习反馈",
              "离线朗读音频缓存",
              `AI 请求队列 ${aiQueueCount} 条`,
              `AI 结果收件箱 ${aiResultCount} 条`
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-muted"
              >
                {item}
              </div>
            ))}
          </div>
          <Separator className="my-5" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
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
            <Button onClick={() => void handleRetryAiRequestQueue()} variant="outline">
              <RotateCw className="h-4 w-4" />
              重试队列
            </Button>
            <Button onClick={handleClearAiRequestQueue} variant="outline">
              <Trash2 className="h-4 w-4" />
              清理队列
            </Button>
            <Button onClick={handleClearAiResultInbox} variant="outline">
              <Trash2 className="h-4 w-4" />
              {confirmClearAiResults ? "确认清理" : "清理结果"}
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
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>TTS 配置和试听</CardTitle>
                <CardDescription>可视化当前 TTS 状态，复制本地 endpoint 模板，并直接试听朗读效果。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">当前 TTS</p>
                    <Badge variant={speechReadiness?.tts.status === "local" ? "default" : "outline"}>
                      {speechReadiness ? getSpeechStatusLabel(speechReadiness.tts.status) : "检查中"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {speechReadiness?.tts.detail ?? "正在读取服务端 TTS 配置。"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel-strong p-4">
                  <p className="text-sm font-semibold text-foreground">`.env.local` 本地 TTS 模板</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-white p-3 text-xs leading-5 text-foreground">
                    {localTtsEnvTemplate}
                  </pre>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  试听文本
                  <Textarea
                    className="mt-2 min-h-24"
                    value={ttsPreviewText}
                    onChange={(event) => setTtsPreviewText(event.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Voice
                    <Input
                      className="mt-2"
                      value={ttsPreviewVoice}
                      onChange={(event) => setTtsPreviewVoice(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-foreground">
                    Instructions
                    <Input
                      className="mt-2"
                      value={ttsPreviewInstructions}
                      onChange={(event) => setTtsPreviewInstructions(event.target.value)}
                    />
                  </label>
                </div>
                <Button onClick={() => void handleTestTtsPreview()} disabled={isTestingTts} className="w-full sm:w-auto">
                  <Volume2 className="h-4 w-4" />
                  {isTestingTts ? "试听中" : "试听 TTS"}
                </Button>
                {ttsPreviewMessage ? (
                  <p className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm leading-6 text-foreground">
                    {ttsPreviewMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>离线语音准备</CardTitle>
                <CardDescription>检查本地 Whisper/STT、本地 TTS 和本地发音评分 endpoint 是否具备。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {speechReadiness ? (
              <div className="space-y-3">
                {[speechReadiness.stt, speechReadiness.tts, speechReadiness.pronunciation].map((item) => {
                  const Icon = item.id === "stt" ? Mic : item.id === "tts" ? Volume2 : Activity;

                  return (
                    <div key={item.id} className="rounded-lg border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs text-muted">{item.provider}</p>
                          </div>
                        </div>
                        <Badge variant={item.status === "local" ? "default" : "outline"}>
                          {getSpeechStatusLabel(item.status)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        关键配置：{item.requiredEnv.join("、")}
                      </p>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-border bg-panel-strong p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {speechReadiness.practiceReady
                      ? "本机完整语音练习链路已准备好"
                      : speechReadiness.offlineReady
                        ? "本机 STT/TTS 已准备好，发音评分可继续配置"
                        : "下一步"}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                    {speechReadiness.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-border bg-white p-4 text-sm leading-6 text-muted">
                正在检查语音配置...
              </p>
            )}
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
