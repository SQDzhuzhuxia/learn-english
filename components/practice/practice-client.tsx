"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  MicOff,
  PenLine,
  Play,
  Square,
  Volume2
} from "lucide-react";
import { practiceModes, todayPractice, writingPrompts } from "@/lib/mock-data";
import { recordStudyActivity } from "@/lib/analytics/progress-store";
import {
  addPracticeAttempt,
  loadPracticeAttempts,
  type PracticeAttemptRecord
} from "@/lib/speech/practice-store";
import { createShadowingFeedback, type ShadowingFeedback } from "@/lib/speech/shadowing-feedback";
import type { AiWritingCorrection } from "@/lib/ai/types";

type CloudTranscription = {
  text: string;
  source: "cloud" | "fallback";
  provider: string;
  model?: string;
  error?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getTimestampMs() {
  return new Date().getTime();
}

export function PracticeClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"browser" | "cloud" | "">("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [feedback, setFeedback] = useState<ShadowingFeedback | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [selectedWritingIndex, setSelectedWritingIndex] = useState(0);
  const [writingText, setWritingText] = useState("");
  const [writingCorrection, setWritingCorrection] = useState<AiWritingCorrection | null>(null);
  const [writingMessage, setWritingMessage] = useState("");
  const [isCorrectingWriting, setIsCorrectingWriting] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const transcriptRef = useRef("");
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setAttempts(loadPracticeAttempts());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((getTimestampMs() - startedAtRef.current) / 1000)));
    }, 500);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  function playPrompt() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setMessage("当前浏览器不支持本地朗读。");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(todayPractice.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function handleCorrectWriting() {
    const prompt = writingPrompts[selectedWritingIndex];

    if (!writingText.trim()) {
      setWritingMessage("请先写一句英文。");
      return;
    }

    setIsCorrectingWriting(true);
    setWritingMessage("正在批改写作...");

    try {
      const response = await fetch("/api/ai/correct-writing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          promptTitle: prompt.title,
          prompt: prompt.prompt,
          level: prompt.level,
          userText: writingText
        })
      });
      const payload = (await response.json()) as {
        correction?: AiWritingCorrection;
        error?: string;
      };

      if (!response.ok || !payload.correction) {
        throw new Error(payload.error ?? "写作批改失败。");
      }

      recordStudyActivity({
        type: "output",
        label: `短写作：${prompt.title}`,
        minutes: 1
      });
      setWritingCorrection(payload.correction);
      setWritingMessage(
        payload.correction.source === "model"
          ? `已由 ${payload.correction.provider} 批改。`
          : "当前使用本地降级写作反馈，配置 AI 后会调用模型。"
      );
    } catch (error) {
      setWritingMessage(error instanceof Error ? error.message : "写作批改失败。");
    } finally {
      setIsCorrectingWriting(false);
    }
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("当前浏览器不支持录音。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = getTimestampMs();
      setElapsedSeconds(0);
      setAudioUrl("");
      setTranscript("");
      setTranscriptSource("");
      setIsTranscribing(false);
      setFeedback(null);
      transcriptRef.current = "";
      setMessage("");

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        void handleRecordingStopped(recorder, stream);
      });

      recorder.start();
      startSpeechRecognition();
      setIsRecording(true);
    } catch {
      setMessage("无法打开麦克风，请检查浏览器权限。");
    }
  }

  async function requestCloudTranscription(blob: Blob) {
    const file = new File([blob], "shadowing.webm", {
      type: blob.type || "audio/webm"
    });
    const formData = new FormData();
    formData.set("file", file);
    formData.set("language", "en");
    formData.set("prompt", todayPractice.prompt);

    const response = await fetch("/api/speech/transcribe", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as {
      transcription?: CloudTranscription;
      error?: string;
    };

    if (!response.ok || !payload.transcription) {
      throw new Error(payload.error ?? "云端转写失败。");
    }

    return payload.transcription;
  }

  async function handleRecordingStopped(recorder: MediaRecorder, stream: MediaStream) {
    const durationSeconds = Math.max(1, Math.floor((getTimestampMs() - startedAtRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    const nextAudioUrl = URL.createObjectURL(blob);
    let finalTranscript = transcriptRef.current.trim();
    let finalTranscriptSource: "browser" | "cloud" | undefined = finalTranscript ? "browser" : undefined;

    setIsTranscribing(true);

    try {
      const cloudTranscription = await requestCloudTranscription(blob);

      if (cloudTranscription.text.trim()) {
        finalTranscript = cloudTranscription.text.trim();
        finalTranscriptSource = "cloud";
      } else if (cloudTranscription.error && !finalTranscript) {
        setMessage(`云端转写未启用：${cloudTranscription.error}`);
      }
    } catch (error) {
      if (!finalTranscript) {
        setMessage(error instanceof Error ? error.message : "云端转写失败。");
      }
    } finally {
      setIsTranscribing(false);
    }

    const nextFeedback = finalTranscript
      ? createShadowingFeedback(todayPractice.prompt, finalTranscript)
      : null;
    const attempt = addPracticeAttempt({
      type: "shadowing",
      prompt: todayPractice.prompt,
      materialTitle: todayPractice.material,
      durationSeconds,
      transcript: finalTranscript || undefined,
      transcriptSource: finalTranscriptSource,
      score: nextFeedback?.score,
      feedback: nextFeedback?.tip
    });

    recordStudyActivity({
      type: "output",
      label: `跟读录音：${todayPractice.title}`,
      minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
      materialTitle: todayPractice.material
    });
    setAudioUrl(nextAudioUrl);
    setTranscript(finalTranscript);
    setTranscriptSource(finalTranscriptSource ?? "");
    setFeedback(nextFeedback);
    setAttempts([attempt, ...loadPracticeAttempts().filter((item) => item.id !== attempt.id)]);
    setMessage(
      finalTranscript
        ? `已保存本次跟读和${finalTranscriptSource === "cloud" ? "云端" : "浏览器"}转写。`
        : "已保存本次跟读记录。"
    );
    stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  function startSpeechRecognition() {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let nextTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        nextTranscript += `${event.results[index][0].transcript} `;
      }

      transcriptRef.current = nextTranscript.trim();
      setTranscript(transcriptRef.current);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-accent">练习</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">输出能力训练台</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            输出不追求多，而是紧跟今天已经听懂读懂的材料：先跟读，再复述，最后写一两句。
          </p>

          <div className="mt-5 rounded-lg border border-accent bg-accent-soft p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">今日推荐</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{todayPractice.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{todayPractice.target}</p>
              </div>
              <button
                onClick={playPrompt}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
              >
                <Volume2 className="h-4 w-4" />
                播放原句
              </button>
            </div>
            <p className="mt-4 rounded-lg border border-border bg-white p-3 text-base font-semibold leading-7 text-foreground">
              {todayPractice.prompt}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-medium text-muted">录音计时</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatSeconds(elapsedSeconds)}
                </p>
              </div>
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <Square className="h-4 w-4" />
                  停止录音
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
                >
                  <Mic className="h-4 w-4" />
                  开始录音
                </button>
              )}
            </div>

            {audioUrl ? (
              <audio className="mt-4 w-full" controls src={audioUrl}>
                <track kind="captions" />
              </audio>
            ) : null}

            {transcript ? (
              <div className="mt-4 rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-medium text-muted">
                  {transcriptSource === "cloud" ? "云端转写" : "浏览器转写"}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{transcript}</p>
              </div>
            ) : null}

            {isTranscribing ? (
              <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                正在请求云端转写...
              </p>
            ) : null}

            {feedback ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-800">{feedback.label}</p>
                  <p className="text-sm font-semibold text-emerald-800">{feedback.score}%</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-700">{feedback.tip}</p>
                {feedback.missingWords.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    漏掉：{feedback.missingWords.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {message ? (
              <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                {message}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">跟读步骤</h2>
            {isRecording ? <MicOff className="h-5 w-5 text-rose-600" /> : <Mic className="h-5 w-5 text-accent" />}
          </div>
          <div className="mt-4 space-y-3">
            {todayPractice.steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <article key={mode.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted">
                  {mode.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{mode.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
              <div className="mt-4 rounded-lg bg-panel-strong p-3">
                <p className="text-sm font-semibold text-foreground">{mode.todayTask}</p>
                <p className="mt-1 text-xs text-muted">
                  {mode.estimatedMinutes} 分钟 · {mode.output}
                </p>
              </div>
              <button className="mt-5 min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong">
                进入
              </button>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">跟读记录</h2>
            <Play className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-3">
            {attempts.slice(0, 4).map((attempt) => (
              <div key={attempt.id} className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">{attempt.prompt}</p>
                <p className="mt-2 text-xs text-muted">
                  {attempt.materialTitle} · {formatSeconds(attempt.durationSeconds)}
                </p>
                {attempt.transcript ? (
                  <p className="mt-2 text-xs leading-5 text-muted">{attempt.transcript}</p>
                ) : null}
                {attempt.transcriptSource ? (
                  <p className="mt-2 text-xs text-muted">
                    {attempt.transcriptSource === "cloud" ? "云端转写" : "浏览器转写"}
                  </p>
                ) : null}
                {typeof attempt.score === "number" ? (
                  <p className="mt-2 text-xs font-semibold text-accent">跟读匹配度 {attempt.score}%</p>
                ) : null}
              </div>
            ))}
            {attempts.length === 0 ? (
              <p className="rounded-lg border border-border bg-white p-4 text-sm leading-6 text-muted">
                今天还没有跟读记录。
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">输出后会沉淀什么</h2>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["录音记录", "浏览器转写", "复习卡"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">{item}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {item === "复习卡" ? "后续接入" : "本轮已接入"}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/review"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong"
          >
            查看会进入复习的内容
            <ArrowRight className="h-4 w-4 text-accent" />
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">短写作教练</h2>
          <PenLine className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {writingPrompts.map((item, index) => (
                <button
                  key={item.title}
                  onClick={() => {
                    setSelectedWritingIndex(index);
                    setWritingCorrection(null);
                    setWritingMessage("");
                  }}
                  className={`rounded-lg border p-3 text-left ${
                    index === selectedWritingIndex
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-white hover:bg-panel-strong"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted">{item.level}</span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">{writingPrompts[selectedWritingIndex].title}</h3>
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                  {writingPrompts[selectedWritingIndex].level}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{writingPrompts[selectedWritingIndex].prompt}</p>
              <textarea
                value={writingText}
                onChange={(event) => setWritingText(event.target.value)}
                className="mt-4 min-h-32 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-accent"
                placeholder="Write your English sentence here..."
              />
              <button
                onClick={handleCorrectWriting}
                disabled={isCorrectingWriting}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                <PenLine className="h-4 w-4" />
                {isCorrectingWriting ? "批改中..." : "AI 批改"}
              </button>
              {writingMessage ? (
                <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                  {writingMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-4">
            <h3 className="font-semibold text-foreground">批改结果</h3>
            {writingCorrection ? (
              <div className="mt-4 space-y-4">
                <section>
                  <p className="text-sm font-medium text-muted">更自然写法</p>
                  <p className="mt-2 rounded-lg bg-panel-strong p-3 text-sm leading-6 text-foreground">
                    {writingCorrection.correctedText}
                  </p>
                </section>
                <section>
                  <p className="text-sm font-medium text-muted">反馈</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{writingCorrection.feedbackZh}</p>
                </section>
                <section>
                  <p className="text-sm font-medium text-muted">重点问题</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {writingCorrection.keyProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p className="text-sm font-medium text-muted">可保存表达</p>
                  <div className="mt-2 space-y-2">
                    {writingCorrection.betterExpressions.map((expression) => (
                      <div key={expression.text} className="rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{expression.meaningZh}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong p-4 text-sm leading-6 text-muted">
                写一句英文后点击批改，系统会给出更自然写法、中文反馈和可保存表达。
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
