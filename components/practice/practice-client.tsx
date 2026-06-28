"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Inbox,
  Mic,
  MicOff,
  PenLine,
  Play,
  Plus,
  Square,
  Target,
  Trash2,
  Volume2
} from "lucide-react";
import {
  practiceModes,
  retellingPractice as fallbackRetellingPractice,
  roleplayScenario as fallbackRoleplayScenario,
  todayPractice as fallbackTodayPractice,
  writingPrompts as fallbackWritingPrompts
} from "@/lib/mock-data";
import { createMaterialPracticeBundle } from "@/lib/content/material-practice";
import {
  findMaterialById,
  getCurrentMaterialId,
  loadMaterials
} from "@/lib/content/material-store";
import type { StudyMaterialRecord } from "@/lib/content/types";
import { requestAiJsonWithQueue } from "@/lib/ai/request-queue";
import {
  clearAiResultInbox,
  deleteAiResultInboxItem,
  loadAiResultInbox,
  type AiResultInboxRecord
} from "@/lib/ai/result-inbox";
import { recordStudyActivity } from "@/lib/analytics/progress-store";
import {
  addPracticeAttempt,
  loadPracticeAttempts,
  type PracticeAttemptRecord
} from "@/lib/speech/practice-store";
import {
  getDuePracticeQuestions,
  loadPracticeQuestions,
  reviewPracticeQuestion,
  upsertPracticeQuestionsFromSet,
  type PracticeQuestionRecord
} from "@/lib/practice/question-bank";
import { createShadowingFeedback, type ShadowingFeedback } from "@/lib/speech/shadowing-feedback";
import { createRetellingFeedback, type RetellingFeedback } from "@/lib/speech/retelling-feedback";
import { createRoleplayFeedback, type RoleplayFeedback } from "@/lib/speech/roleplay-feedback";
import { summarizeRoleplayMemory } from "@/lib/speech/roleplay-memory";
import { summarizeRoleplaySession } from "@/lib/speech/roleplay-session-summary";
import { createRoleplayTransferPlan } from "@/lib/speech/roleplay-transfer";
import { trackRoleplayGoal } from "@/lib/speech/roleplay-goal-tracker";
import { speakEnglishText } from "@/lib/speech/speech-synthesis";
import { saveWritingItemAsReviewCard } from "@/lib/review/review-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToastMessage } from "@/components/ui/toast";
import type {
  AiGeneratedPracticeSet,
  AiRoleplayTurn,
  AiSegmentExpression,
  AiWritingCorrection,
  RoleplayTranscriptTurn
} from "@/lib/ai/types";
import type { PronunciationScoringResult } from "@/lib/speech/server/pronunciation-score";

type CloudTranscription = {
  text: string;
  source: "cloud" | "local" | "fallback";
  provider: string;
  model?: string;
  error?: string;
};

type TranscriptSource = "browser" | "cloud" | "local";
type RecordingMode = "shadowing" | "retelling";

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

type RoleplayTranscriptEntry = {
  turnId: string;
  partnerText: string;
  learnerText: string;
  score: number;
  feedback: string;
};

type PracticeRoleplayTurn = {
  id: string;
  partnerLine: string;
  translation: string;
  userGoalZh: string;
  expectedKeywords: string[];
  suggestedReplies: string[];
  isAiGenerated?: boolean;
};

const ROLEPLAY_KEYWORD_STOP_WORDS = new Set([
  "with",
  "that",
  "this",
  "have",
  "would",
  "could",
  "please",
  "thank",
  "your"
]);

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatShortDate(value?: string) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }

  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric"
  });
}

function getTimestampMs() {
  return new Date().getTime();
}

function getTranscriptSourceLabel(source: TranscriptSource) {
  if (source === "local") {
    return "本地转写";
  }

  return source === "cloud" ? "云端转写" : "浏览器转写";
}

function getPracticeAttemptTypeLabel(type: PracticeAttemptRecord["type"]) {
  const labels: Record<PracticeAttemptRecord["type"], string> = {
    shadowing: "跟读",
    retelling: "复述",
    writing: "写作",
    roleplay: "角色"
  };

  return labels[type];
}

function getAiResultInboxTypeLabel(kind: AiResultInboxRecord["kind"]) {
  if (kind === "roleplay-next") {
    return "角色追问";
  }

  if (kind === "generate-practice") {
    return "AI 练习集";
  }

  return "写作/复述反馈";
}

function getAiResultCorrection(record: AiResultInboxRecord) {
  const payload = record.resultPayload as { correction?: AiWritingCorrection };
  return payload.correction;
}

function getAiResultTurn(record: AiResultInboxRecord) {
  const payload = record.resultPayload as { turn?: AiRoleplayTurn };
  return payload.turn;
}

function getAiResultPracticeSet(record: AiResultInboxRecord) {
  const payload = record.resultPayload as { practiceSet?: AiGeneratedPracticeSet };
  return payload.practiceSet;
}

function getAiResultRequest(record: AiResultInboxRecord) {
  return record.requestPayload as {
    promptTitle?: string;
    prompt?: string;
    userText?: string;
  };
}

function createExpectedKeywordsFromReplies(replies: string[]) {
  const seen = new Set<string>();
  const words = replies.join(" ").match(/[A-Za-z][A-Za-z'-]*/g) ?? [];

  return words
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 3 && !ROLEPLAY_KEYWORD_STOP_WORDS.has(word))
    .filter((word) => {
      if (seen.has(word)) {
        return false;
      }

      seen.add(word);
      return true;
    })
    .slice(0, 3);
}

function saveAiCorrectionSuggestions(input: {
  correction: AiWritingCorrection;
  promptTitle: string;
  prompt: string;
  correctedMeaningZh: string;
  correctedExample: string;
  createKey: (kind: "corrected-sentence" | "expression", text: string) => string;
}) {
  const savedKeys: Record<string, boolean> = {};
  let created = 0;
  let total = 0;
  const correctedKey = input.createKey("corrected-sentence", input.correction.correctedText);
  const correctedResult = saveWritingItemAsReviewCard({
    kind: "corrected-sentence",
    promptTitle: input.promptTitle,
    prompt: input.prompt,
    originalText: input.correction.originalText,
    correctedText: input.correction.correctedText,
    text: input.correction.correctedText,
    meaningZh: input.correctedMeaningZh,
    example: input.correctedExample
  });

  total += 1;
  created += correctedResult.created ? 1 : 0;
  savedKeys[correctedKey] = true;

  input.correction.betterExpressions.forEach((expression) => {
    const key = input.createKey("expression", expression.text);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: input.promptTitle,
      prompt: input.prompt,
      originalText: input.correction.originalText,
      correctedText: input.correction.correctedText,
      text: expression.text,
      meaningZh: expression.meaningZh,
      example: expression.example || input.correction.correctedText
    });

    total += 1;
    created += result.created ? 1 : 0;
    savedKeys[key] = true;
  });

  return {
    created,
    total,
    savedKeys
  };
}

export function PracticeClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode | "">("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource | "">("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [feedback, setFeedback] = useState<ShadowingFeedback | null>(null);
  const [pronunciationScore, setPronunciationScore] = useState<PronunciationScoringResult | null>(null);
  const [isScoringPronunciation, setIsScoringPronunciation] = useState(false);
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [aiResults, setAiResults] = useState<AiResultInboxRecord[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<StudyMaterialRecord | undefined>(undefined);
  const [retellingText, setRetellingText] = useState("");
  const [retellingFeedback, setRetellingFeedback] = useState<RetellingFeedback | null>(null);
  const [retellingMessage, setRetellingMessage] = useState("");
  const [retellingSaveMessage, setRetellingSaveMessage] = useState("");
  const [retellingAudioUrl, setRetellingAudioUrl] = useState("");
  const [retellingTranscriptSource, setRetellingTranscriptSource] = useState<TranscriptSource | "">("");
  const [isRetellingTranscribing, setIsRetellingTranscribing] = useState(false);
  const [savedRetellingKeys, setSavedRetellingKeys] = useState<Record<string, boolean>>({});
  const [retellingAiCorrection, setRetellingAiCorrection] = useState<AiWritingCorrection | null>(null);
  const [isCorrectingRetelling, setIsCorrectingRetelling] = useState(false);
  const [retellingAiSaveMessage, setRetellingAiSaveMessage] = useState("");
  const [savedRetellingAiKeys, setSavedRetellingAiKeys] = useState<Record<string, boolean>>({});
  const [roleplayTurnIndex, setRoleplayTurnIndex] = useState(0);
  const [roleplayReply, setRoleplayReply] = useState("");
  const [roleplayFeedback, setRoleplayFeedback] = useState<RoleplayFeedback | null>(null);
  const [roleplayTranscript, setRoleplayTranscript] = useState<RoleplayTranscriptEntry[]>([]);
  const [roleplayMessage, setRoleplayMessage] = useState("");
  const [roleplaySaveMessage, setRoleplaySaveMessage] = useState("");
  const [savedRoleplayKeys, setSavedRoleplayKeys] = useState<Record<string, boolean>>({});
  const [roleplayAiCorrection, setRoleplayAiCorrection] = useState<AiWritingCorrection | null>(null);
  const [isCorrectingRoleplay, setIsCorrectingRoleplay] = useState(false);
  const [roleplayAiSaveMessage, setRoleplayAiSaveMessage] = useState("");
  const [savedRoleplayAiKeys, setSavedRoleplayAiKeys] = useState<Record<string, boolean>>({});
  const [dynamicRoleplayTurns, setDynamicRoleplayTurns] = useState<PracticeRoleplayTurn[]>([]);
  const [isGeneratingRoleplayTurn, setIsGeneratingRoleplayTurn] = useState(false);
  const [generatedPracticeSet, setGeneratedPracticeSet] = useState<AiGeneratedPracticeSet | null>(null);
  const [isGeneratingPracticeSet, setIsGeneratingPracticeSet] = useState(false);
  const [practiceGenerationMessage, setPracticeGenerationMessage] = useState("");
  const [duePracticeQuestions, setDuePracticeQuestions] = useState<PracticeQuestionRecord[]>([]);
  const [practiceQuestionCount, setPracticeQuestionCount] = useState(0);
  const [selectedWritingIndex, setSelectedWritingIndex] = useState(0);
  const [writingText, setWritingText] = useState("");
  const [writingCorrection, setWritingCorrection] = useState<AiWritingCorrection | null>(null);
  const [writingMessage, setWritingMessage] = useState("");
  const [writingSaveMessage, setWritingSaveMessage] = useState("");
  const [savedWritingKeys, setSavedWritingKeys] = useState<Record<string, boolean>>({});
  const [isCorrectingWriting, setIsCorrectingWriting] = useState(false);
  const [aiResultInboxMessage, setAiResultInboxMessage] = useState("");
  const [confirmClearAiResults, setConfirmClearAiResults] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const transcriptRef = useRef("");
  const startedAtRef = useRef<number>(0);
  useToastMessage(message, { title: "跟读" });
  useToastMessage(retellingMessage, { title: "复述" });
  useToastMessage(roleplayMessage, { title: "角色扮演" });
  useToastMessage(practiceGenerationMessage, { title: "AI 练习" });
  useToastMessage(writingMessage, { title: "写作" });
  useToastMessage(aiResultInboxMessage, { title: "AI 结果" });

  const practiceBundle = useMemo(
    () => (currentMaterial ? createMaterialPracticeBundle(currentMaterial) : null),
    [currentMaterial]
  );
  const todayPractice = practiceBundle?.shadowing ?? fallbackTodayPractice;
  const retellingPractice = practiceBundle?.retelling ?? fallbackRetellingPractice;
  const roleplayScenario = practiceBundle?.roleplay ?? fallbackRoleplayScenario;
  const writingPrompts = practiceBundle?.writingPrompts ?? fallbackWritingPrompts;
  const materialDrills = practiceBundle?.drills ?? [];

  useEffect(() => {
    let cancelled = false;

    function handleAiResultInboxUpdated() {
      if (!cancelled) {
        setAiResults(loadAiResultInbox());
      }
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setAttempts(loadPracticeAttempts());
        setAiResults(loadAiResultInbox());
        refreshPracticeQuestionQueue();
        const materials = loadMaterials();
        const currentId = getCurrentMaterialId();
        setCurrentMaterial(
          (currentId ? findMaterialById(currentId) : undefined) ?? materials[0]
        );
      }
    });

    window.addEventListener("learn-english:ai-result-inbox-updated", handleAiResultInboxUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("learn-english:ai-result-inbox-updated", handleAiResultInboxUpdated);
    };
  }, []);

  function refreshPracticeQuestionQueue() {
    setDuePracticeQuestions(getDuePracticeQuestions(new Date(), 6));
    setPracticeQuestionCount(loadPracticeQuestions().length);
  }

  function refreshAiResults() {
    setAiResults(loadAiResultInbox());
  }

  function handleDeleteAiResult(id: string) {
    deleteAiResultInboxItem(id);
    setConfirmClearAiResults(false);
    refreshAiResults();
  }

  function handleClearAiResults() {
    if (!confirmClearAiResults) {
      setConfirmClearAiResults(true);
      setAiResultInboxMessage("再次点击确认清空 AI 结果收件箱。");
      return;
    }

    clearAiResultInbox();
    setConfirmClearAiResults(false);
    setAiResultInboxMessage("已清空 AI 结果收件箱。");
    refreshAiResults();
  }

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((getTimestampMs() - startedAtRef.current) / 1000)));
    }, 500);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  async function playPrompt() {
    setMessage("正在准备英文朗读...");
    const result = await speakEnglishText(todayPractice.prompt, { rate: 0.72 });
    setMessage(result.ok ? `${result.message} 请先听两遍，再开始录音。` : result.message);
  }

  function scrollToPracticeMode(modeId: string) {
    const targetMap: Record<string, string> = {
      shadowing: "practice-shadowing",
      retelling: "practice-retelling",
      roleplay: "practice-roleplay",
      writing: "practice-writing"
    };
    const targetId = targetMap[modeId];

    if (!targetId) {
      return false;
    }

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function handleOpenPracticeMode(modeId: string) {
    if (!scrollToPracticeMode(modeId)) {
      setMessage("这个练习入口还没有配置目标区域。");
      return;
    }

    if (modeId === "shadowing") {
      setMessage("已定位到跟读训练。先播放原句，再录音。");
    }

    if (modeId === "retelling") {
      setRetellingMessage("已定位到复述训练。可以先用提示句，再提交反馈。");
    }

    if (modeId === "roleplay") {
      setRoleplayMessage("已定位到场景口语。先听前台台词，再输入你的回答。");
    }

    if (modeId === "writing") {
      setWritingMessage("已定位到短写作教练。写一句英文后点击 AI 修改。");
    }
  }

  function handleApplyAiResult(result: AiResultInboxRecord) {
    const correction = getAiResultCorrection(result);
    const turn = getAiResultTurn(result);
    const practiceSet = getAiResultPracticeSet(result);
    const request = getAiResultRequest(result);

    if (practiceSet) {
      setGeneratedPracticeSet(practiceSet);
      setPracticeGenerationMessage(`已载入 AI 练习集：${practiceSet.drills.length} 道题。`);
      return;
    }

    if (correction) {
      const sourceText = request.userText ?? correction.originalText;

      if (request.promptTitle?.startsWith("复述：")) {
        setRetellingText(sourceText);
        setRetellingAiCorrection(correction);
        setRetellingAiSaveMessage("");
        setSavedRetellingAiKeys({});
        scrollToPracticeMode("retelling");
        setRetellingMessage("已载入 AI 复述反馈。");
        return;
      }

      if (request.promptTitle?.startsWith("角色扮演：")) {
        setRoleplayReply(sourceText);
        setRoleplayAiCorrection(correction);
        setRoleplayAiSaveMessage("");
        setSavedRoleplayAiKeys({});
        scrollToPracticeMode("roleplay");
        setRoleplayMessage("已载入 AI 角色回答反馈。");
        return;
      }

      setWritingText(sourceText);
      setWritingCorrection(correction);
      setWritingSaveMessage("");
      setSavedWritingKeys({});
      scrollToPracticeMode("writing");
      setWritingMessage("已载入 AI 写作反馈。");
      return;
    }

    if (turn) {
      const nextTurn: PracticeRoleplayTurn = {
        id: `inbox-roleplay-${Date.parse(result.createdAt)}-${result.id.slice(-6)}`,
        partnerLine: turn.partnerLine,
        translation: turn.translationZh,
        userGoalZh: turn.userGoalZh,
        expectedKeywords: createExpectedKeywordsFromReplies(turn.suggestedReplies),
        suggestedReplies: turn.suggestedReplies,
        isAiGenerated: true
      };

      setDynamicRoleplayTurns((current) =>
        current.some((item) => item.partnerLine === nextTurn.partnerLine)
          ? current
          : [...current, nextTurn]
      );
      scrollToPracticeMode("roleplay");
      setRoleplayMessage("已把 AI 追问加入角色扮演。");
    }
  }

  function handleSaveAiResultAsReviewCards(result: AiResultInboxRecord) {
    const correction = getAiResultCorrection(result);
    const turn = getAiResultTurn(result);
    const practiceSet = getAiResultPracticeSet(result);
    const request = getAiResultRequest(result);

    if (practiceSet) {
      const saved = upsertPracticeQuestionsFromSet({
        materialId: currentMaterial?.id,
        practiceSet
      });

      refreshPracticeQuestionQueue();
      setAiResultInboxMessage(
        saved.created > 0
          ? `已从 AI 练习集新增 ${saved.created} 道题，更新 ${saved.updated} 道题。`
          : `这组 AI 练习题已经在题库里，已更新 ${saved.updated} 道题。`
      );
      return;
    }

    if (correction) {
      const promptTitle = request.promptTitle ?? result.title;
      const isRetelling = promptTitle.startsWith("复述：");
      const isRoleplay = promptTitle.startsWith("角色扮演：");
      const saved = saveAiCorrectionSuggestions({
        correction,
        promptTitle,
        prompt:
          request.prompt ??
          (isRetelling
            ? retellingPractice.prompt
            : isRoleplay
              ? roleplayScenario.goal
              : writingPrompts[selectedWritingIndex].prompt),
        correctedMeaningZh: isRetelling
          ? "AI 优化后的复述句"
          : isRoleplay
            ? "AI 优化后的角色回答"
            : "AI 优化后的写作句子",
        correctedExample: correction.correctedText,
        createKey: (kind, text) => `inbox:${result.id}:${kind}:${text.trim().toLowerCase()}`
      });

      setAiResultInboxMessage(
        saved.created > 0
          ? `已从 AI 结果生成 ${saved.created}/${saved.total} 个复习项目。`
          : "这条 AI 结果中的建议已经在复习系统里。"
      );
      return;
    }

    if (turn) {
      let created = 0;
      const replies = turn.suggestedReplies.filter((reply) => reply.trim().length > 0);

      replies.forEach((reply) => {
        const saved = saveWritingItemAsReviewCard({
          kind: "corrected-sentence",
          promptTitle: `角色扮演：${result.title}`,
          prompt: turn.userGoalZh,
          originalText: turn.partnerLine,
          correctedText: reply,
          text: reply,
          meaningZh: "AI 推荐角色回答",
          example: `Partner: ${turn.partnerLine} / Me: ${reply}`
        });

        created += saved.created ? 1 : 0;
      });

      setAiResultInboxMessage(
        created > 0
          ? `已从 AI 追问生成 ${created}/${replies.length} 个复习项目。`
          : "这条 AI 追问中的建议已经在复习系统里。"
      );
    }
  }

  function handleUseRetellingStarter(starter: string) {
    setRetellingText((current) => `${current.trim()} ${starter}`.trim());
    setRetellingMessage("");
  }

  function handleEvaluateRetelling() {
    if (!retellingText.trim()) {
      setRetellingMessage("请先写 1-2 句英文复述。");
      return;
    }

    const nextFeedback = createRetellingFeedback({
      transcript: retellingText,
      keyPoints: retellingPractice.keyPoints,
      usefulWords: retellingPractice.usefulWords
    });
    const attempt = addPracticeAttempt({
      type: "retelling",
      prompt: retellingPractice.prompt,
      materialTitle: retellingPractice.material,
      durationSeconds: Math.max(30, retellingText.trim().split(/\s+/).length * 3),
      transcript: retellingText.trim(),
      score: nextFeedback.score,
      feedback: nextFeedback.tip
    });

    recordStudyActivity({
      type: "output",
      label: `复述练习：${retellingPractice.title}`,
      minutes: 2,
      materialTitle: retellingPractice.material
    });
    setRetellingFeedback(nextFeedback);
    setAttempts([attempt, ...loadPracticeAttempts().filter((item) => item.id !== attempt.id)]);
    setRetellingMessage("已保存本次复述记录。");
    setRetellingSaveMessage("");
    setSavedRetellingKeys({});
    setRetellingAiCorrection(null);
    setRetellingAiSaveMessage("");
    setSavedRetellingAiKeys({});
  }

  function createRetellingSaveKey(kind: "sentence" | "expression", text: string) {
    return `retelling:${kind}:${text.trim().toLowerCase()}`;
  }

  function markRetellingItemSaved(key: string) {
    setSavedRetellingKeys((current) => ({
      ...current,
      [key]: true
    }));
  }

  function handleSaveRetellingSentence() {
    if (!retellingText.trim()) {
      setRetellingSaveMessage("请先完成一段复述。");
      return;
    }

    const key = createRetellingSaveKey("sentence", retellingText);
    const result = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: retellingPractice.title,
      prompt: retellingPractice.prompt,
      originalText: retellingPractice.sourceSummary,
      correctedText: retellingText.trim(),
      text: retellingText.trim(),
      meaningZh: "我的复述句",
      example: retellingText.trim()
    });

    markRetellingItemSaved(key);
    setRetellingSaveMessage(
      result.created
        ? `已保存复述句，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : "这条复述句已经在复习系统里。"
    );
  }

  function handleSaveRetellingExpression(expression: string) {
    const key = createRetellingSaveKey("expression", expression);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: retellingPractice.title,
      prompt: retellingPractice.prompt,
      originalText: retellingPractice.sourceSummary,
      correctedText: retellingText.trim(),
      text: expression,
      meaningZh: "复述关键词",
      example: retellingText.trim() || retellingPractice.sourceSummary
    });

    markRetellingItemSaved(key);
    setRetellingSaveMessage(
      result.created
        ? `已保存表达“${expression}”，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : `表达“${expression}”已经在复习系统里。`
    );
  }

  function createRetellingAiSaveKey(kind: "corrected-sentence" | "expression", text: string) {
    return `retelling-ai:${kind}:${text.trim().toLowerCase()}`;
  }

  function markRetellingAiItemSaved(key: string) {
    setSavedRetellingAiKeys((current) => ({
      ...current,
      [key]: true
    }));
  }

  async function handleCorrectRetellingWithAi() {
    if (!retellingText.trim()) {
      setRetellingMessage("请先完成一段复述，再请求 AI 自然度反馈。");
      return;
    }

    setIsCorrectingRetelling(true);
    setRetellingMessage("正在生成 AI 复述反馈...");

    try {
      const requestPayload = {
        promptTitle: `复述：${retellingPractice.title}`,
        prompt: `${retellingPractice.prompt}\n原材料大意：${retellingPractice.sourceSummary}`,
        level: "A1-A2",
        userText: retellingText
      };
      const result = await requestAiJsonWithQueue<{
        correction?: AiWritingCorrection;
        error?: string;
      }>({
        kind: "correct-writing",
        endpoint: "/api/ai/correct-writing",
        payload: requestPayload,
        errorMessage: "AI 复述反馈生成失败。"
      });

      if (result.queued) {
        setRetellingMessage(
          `AI 复述反馈暂不可用，已加入本地队列。稍后恢复网络后可重新点击。队列记录：${result.queueItem.id.slice(-8)}`
        );
        return;
      }

      const payload = result.payload;

      if (!payload.correction) {
        throw new Error(payload.error ?? "AI 复述反馈生成失败。");
      }

      recordStudyActivity({
        type: "ai",
        label: `AI 复述反馈：${retellingPractice.title}`,
        materialTitle: retellingPractice.material
      });
      setRetellingAiCorrection(payload.correction);
      setRetellingAiSaveMessage("");
      setSavedRetellingAiKeys({});
      setRetellingMessage(
        payload.correction.source === "model"
          ? `已由 ${payload.correction.provider} 生成复述自然度反馈。`
          : "当前使用本地降级复述反馈，配置 AI 后会调用模型。"
      );
    } catch (error) {
      setRetellingMessage(error instanceof Error ? error.message : "AI 复述反馈生成失败。");
    } finally {
      setIsCorrectingRetelling(false);
    }
  }

  function handleSaveRetellingAiCorrection() {
    if (!retellingAiCorrection) {
      return;
    }

    const key = createRetellingAiSaveKey("corrected-sentence", retellingAiCorrection.correctedText);
    const result = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: retellingPractice.title,
      prompt: retellingPractice.prompt,
      originalText: retellingAiCorrection.originalText,
      correctedText: retellingAiCorrection.correctedText,
      text: retellingAiCorrection.correctedText,
      meaningZh: "AI 优化后的复述句",
      example: retellingAiCorrection.correctedText
    });

    markRetellingAiItemSaved(key);
    setRetellingAiSaveMessage(
      result.created
        ? `已保存 AI 优化复述句，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : "这条 AI 优化复述句已经在复习系统里。"
    );
  }

  function handleSaveRetellingAiExpression(expression: AiSegmentExpression) {
    if (!retellingAiCorrection) {
      return;
    }

    const key = createRetellingAiSaveKey("expression", expression.text);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: retellingPractice.title,
      prompt: retellingPractice.prompt,
      originalText: retellingAiCorrection.originalText,
      correctedText: retellingAiCorrection.correctedText,
      text: expression.text,
      meaningZh: expression.meaningZh,
      example: expression.example || retellingAiCorrection.correctedText
    });

    markRetellingAiItemSaved(key);
    setRetellingAiSaveMessage(
      result.created
        ? `已保存表达“${expression.text}”，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : `表达“${expression.text}”已经在复习系统里。`
    );
  }

  function handleSaveAllRetellingAiSuggestions() {
    if (!retellingAiCorrection) {
      return;
    }

    const result = saveAiCorrectionSuggestions({
      correction: retellingAiCorrection,
      promptTitle: retellingPractice.title,
      prompt: retellingPractice.prompt,
      correctedMeaningZh: "AI 优化后的复述句",
      correctedExample: retellingAiCorrection.correctedText,
      createKey: createRetellingAiSaveKey
    });

    setSavedRetellingAiKeys((current) => ({ ...current, ...result.savedKeys }));
    setRetellingAiSaveMessage(
      result.created > 0
        ? `已一键保存 ${result.created}/${result.total} 个 AI 复述建议。`
        : "这些 AI 复述建议已经在复习系统里。"
    );
  }

  function createRoleplaySaveKey(kind: "natural-reply" | "expression", text: string) {
    return `roleplay:${kind}:${text.trim().toLowerCase()}`;
  }

  function markRoleplayItemSaved(key: string) {
    setSavedRoleplayKeys((current) => ({
      ...current,
      [key]: true
    }));
  }

  async function handlePlayRoleplayPartnerLine() {
    const currentTurn = allRoleplayTurns[roleplayTurnIndex];

    if (!currentTurn) {
      return;
    }

    setRoleplayMessage("正在播放前台台词...");
    const result = await speakEnglishText(currentTurn.partnerLine, { rate: 0.78 });
    setRoleplayMessage(result.ok ? `${result.message} 听完后输入你的回答。` : result.message);
  }

  function handleUseRoleplaySuggestedReply(reply: string) {
    setRoleplayReply(reply);
    setRoleplayMessage("已填入推荐回答，可以直接提交，也可以改成你自己的说法。");
  }

  function handleSubmitRoleplayReply() {
    const currentTurn = allRoleplayTurns[roleplayTurnIndex];

    if (!currentTurn) {
      return;
    }

    if (roleplayTranscript.length >= allRoleplayTurns.length) {
      setRoleplayMessage("这一轮角色扮演已经完成。可以点击 AI 继续追问，或重新开始再练一遍。");
      return;
    }

    if (!roleplayReply.trim()) {
      setRoleplayMessage("请先输入一句英文回答；不会说可以点推荐回答。");
      return;
    }

    const nextFeedback = createRoleplayFeedback({
      reply: roleplayReply,
      expectedKeywords: currentTurn.expectedKeywords,
      suggestedReply: currentTurn.suggestedReplies[0]
    });
    const nextEntry: RoleplayTranscriptEntry = {
      turnId: currentTurn.id,
      partnerText: currentTurn.partnerLine,
      learnerText: roleplayReply.trim(),
      score: nextFeedback.score,
      feedback: nextFeedback.tip
    };
    const nextTranscript = [...roleplayTranscript, nextEntry];
    const isComplete = nextTranscript.length >= allRoleplayTurns.length;
    const nextSessionSummary = summarizeRoleplaySession({
      scenarioTitle: roleplayScenario.title,
      goal: roleplayScenario.goal,
      totalTurns: allRoleplayTurns.length,
      entries: nextTranscript
    });

    setRoleplayFeedback(nextFeedback);
    setRoleplayTranscript(nextTranscript);
    setRoleplaySaveMessage("");
    setSavedRoleplayKeys({});
    setRoleplayAiCorrection(null);
    setRoleplayAiSaveMessage("");
    setSavedRoleplayAiKeys({});

    if (isComplete) {
      const transcriptText = nextTranscript
        .map((entry) => `Front desk: ${entry.partnerText}\nMe: ${entry.learnerText}`)
        .join("\n\n");
      const attempt = addPracticeAttempt({
        type: "roleplay",
        prompt: roleplayScenario.title,
        materialTitle: roleplayScenario.material,
        durationSeconds: Math.max(90, nextTranscript.length * 45),
        transcript: transcriptText,
        score: nextSessionSummary.averageScore,
        feedback: nextSessionSummary.summaryZh
      });

      recordStudyActivity({
        type: "output",
        label: `角色扮演：${roleplayScenario.title}`,
        minutes: Math.max(3, nextTranscript.length),
        materialTitle: roleplayScenario.material
      });
      setAttempts([attempt, ...loadPracticeAttempts().filter((item) => item.id !== attempt.id)]);
      setRoleplayReply("");
      setRoleplayMessage(
        `已完成角色扮演并保存记录，平均完成度 ${nextSessionSummary.averageScore}%。${nextSessionSummary.nextPractice[0]}`
      );
      return;
    }

    setRoleplayTurnIndex((index) => index + 1);
    setRoleplayReply("");
    setRoleplayMessage(`这一轮已保存反馈，当前平均完成度 ${nextSessionSummary.averageScore}%，继续下一句对话。`);
  }

  function handleResetRoleplay() {
    setRoleplayTurnIndex(0);
    setRoleplayReply("");
    setRoleplayFeedback(null);
    setRoleplayTranscript([]);
    setDynamicRoleplayTurns([]);
    setRoleplayMessage("已重新开始。先听第一句，再回答。");
    setRoleplaySaveMessage("");
    setSavedRoleplayKeys({});
    setRoleplayAiCorrection(null);
    setRoleplayAiSaveMessage("");
    setSavedRoleplayAiKeys({});
  }

  function buildRoleplayTranscriptForAi(entries = roleplayTranscript): RoleplayTranscriptTurn[] {
    return entries.flatMap((entry) => [
      {
        speaker: "partner" as const,
        text: entry.partnerText
      },
      {
        speaker: "learner" as const,
        text: entry.learnerText
      }
    ]);
  }

  async function handleGenerateNextRoleplayTurn() {
    if (roleplayTranscript.length === 0) {
      setRoleplayMessage("请先完成至少一轮角色扮演，再让 AI 继续追问。");
      return;
    }

    setIsGeneratingRoleplayTurn(true);
    setRoleplayMessage("正在生成下一轮角色扮演问题...");

    try {
      const requestPayload = {
        scenarioTitle: roleplayScenario.title,
        setting: roleplayScenario.setting,
        goal: roleplayScenario.goal,
        level: roleplayScenario.level,
        partnerRole: roleplayScenario.partnerRole,
        learnerRole: roleplayScenario.learnerRole,
        transcript: buildRoleplayTranscriptForAi()
      };
      const result = await requestAiJsonWithQueue<{
        turn?: {
          partnerLine: string;
          translationZh: string;
          userGoalZh: string;
          suggestedReplies: string[];
          source: "model" | "fallback";
          provider: string;
        };
        error?: string;
      }>({
        kind: "roleplay-next",
        endpoint: "/api/ai/roleplay-next",
        payload: requestPayload,
        errorMessage: "AI 继续追问生成失败。"
      });

      if (result.queued) {
        setRoleplayMessage(
          `AI 继续追问暂不可用，已加入本地队列。稍后恢复网络后可重新点击。队列记录：${result.queueItem.id.slice(-8)}`
        );
        return;
      }

      const payload = result.payload;

      if (!payload.turn) {
        throw new Error(payload.error ?? "AI 继续追问生成失败。");
      }

      const nextTurn: PracticeRoleplayTurn = {
        id: `ai-roleplay-${dynamicRoleplayTurns.length + 1}`,
        partnerLine: payload.turn.partnerLine,
        translation: payload.turn.translationZh,
        userGoalZh: payload.turn.userGoalZh,
        suggestedReplies: payload.turn.suggestedReplies,
        expectedKeywords: createExpectedKeywordsFromReplies(payload.turn.suggestedReplies),
        isAiGenerated: payload.turn.source === "model"
      };

      setDynamicRoleplayTurns((current) => [...current, nextTurn]);
      setRoleplayTurnIndex(allRoleplayTurns.length);
      setRoleplayReply("");
      setRoleplayFeedback(null);
      setRoleplayAiCorrection(null);
      setRoleplayAiSaveMessage("");
      setSavedRoleplayAiKeys({});
      setRoleplayMessage(
        payload.turn.source === "model"
          ? `已由 ${payload.turn.provider} 生成下一轮追问。`
          : "当前使用本地降级追问，配置 AI 后会调用模型。"
      );
    } catch (error) {
      setRoleplayMessage(error instanceof Error ? error.message : "AI 继续追问生成失败。");
    } finally {
      setIsGeneratingRoleplayTurn(false);
    }
  }

  async function handleGeneratePracticeSet() {
    if (!currentMaterial) {
      setPracticeGenerationMessage("请先在今日页或材料库选择一篇当前材料。");
      return;
    }

    setIsGeneratingPracticeSet(true);
    setPracticeGenerationMessage("正在基于当前材料生成更多练习...");

    try {
      const requestPayload = {
        materialId: currentMaterial.id,
        materialTitle: currentMaterial.title,
        materialType: currentMaterial.type,
        level: currentMaterial.level,
        summary: currentMaterial.summary,
        keyExpressions: currentMaterial.keyExpressions,
        targetCount: 8,
        focus: "跟读、复述、填空、问答、写作和角色扮演",
        segments: currentMaterial.segments.map((segment) => ({
          id: segment.id,
          order: segment.order,
          text: segment.text
        }))
      };
      const result = await requestAiJsonWithQueue<{
        practiceSet?: AiGeneratedPracticeSet;
        error?: string;
      }>({
        kind: "generate-practice",
        endpoint: "/api/ai/generate-practice",
        payload: requestPayload,
        metadata: {
          materialId: currentMaterial.id,
          materialTitle: currentMaterial.title
        },
        errorMessage: "AI 练习生成失败。"
      });

      if (result.queued) {
        setPracticeGenerationMessage(
          `AI 练习生成暂不可用，已加入本地队列。稍后恢复后可在 AI 结果收件箱载入。队列记录：${result.queueItem.id.slice(-8)}`
        );
        return;
      }

      const payload = result.payload;

      if (!payload.practiceSet) {
        throw new Error(payload.error ?? "AI 练习生成失败。");
      }

      setGeneratedPracticeSet(payload.practiceSet);
      setPracticeGenerationMessage(
        payload.practiceSet.source === "model"
          ? `已由 ${payload.practiceSet.provider} 生成 ${payload.practiceSet.drills.length} 道练习。`
          : `当前使用本地降级生成 ${payload.practiceSet.drills.length} 道练习，配置 AI 后会调用模型。`
      );
    } catch (error) {
      setPracticeGenerationMessage(error instanceof Error ? error.message : "AI 练习生成失败。");
    } finally {
      setIsGeneratingPracticeSet(false);
    }
  }

  function handleSaveGeneratedPracticeSet() {
    if (!generatedPracticeSet) {
      setPracticeGenerationMessage("请先生成一组练习。");
      return;
    }

    const saved = upsertPracticeQuestionsFromSet({
      materialId: currentMaterial?.id,
      practiceSet: generatedPracticeSet
    });

    refreshPracticeQuestionQueue();
    recordStudyActivity({
      type: "asset",
      label: `保存练习题：${generatedPracticeSet.materialTitle}`,
      materialId: currentMaterial?.id,
      materialTitle: generatedPracticeSet.materialTitle
    });
    setPracticeGenerationMessage(
      saved.created > 0
        ? `已新增 ${saved.created} 道题到练习题库，更新 ${saved.updated} 道题。`
        : `这组练习题已经在题库里，已更新 ${saved.updated} 道题。`
    );
  }

  function handleReviewPracticeQuestion(question: PracticeQuestionRecord, rating: "again" | "hard" | "good" | "easy") {
    const result = reviewPracticeQuestion({
      questionId: question.id,
      rating,
      correct: rating === "good" || rating === "easy"
    });

    if (!result) {
      setPracticeGenerationMessage("没有找到这道练习题。");
      return;
    }

    refreshPracticeQuestionQueue();
    recordStudyActivity({
      type: "review",
      label: `练习题复习：${question.title}`,
      minutes: 1,
      materialTitle: question.materialTitle
    });
    setPracticeGenerationMessage(`已记录「${question.title}」的练习结果，下次复习已重新安排。`);
  }

  function handleSaveRoleplayNaturalReply() {
    if (!roleplayFeedback) {
      setRoleplaySaveMessage("请先提交一句角色扮演回答。");
      return;
    }

    const lastEntry = roleplayTranscript.at(-1);
    const key = createRoleplaySaveKey("natural-reply", roleplayFeedback.naturalReply);
    const result = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: `角色扮演：${roleplayScenario.title}`,
      prompt: lastEntry?.partnerText ?? roleplayScenario.goal,
      originalText: roleplayFeedback.originalReply,
      correctedText: roleplayFeedback.naturalReply,
      text: roleplayFeedback.naturalReply,
      meaningZh: "场景口语自然回答",
      example: lastEntry
        ? `Front desk: ${lastEntry.partnerText} / Me: ${roleplayFeedback.naturalReply}`
        : roleplayFeedback.naturalReply
    });

    markRoleplayItemSaved(key);
    setRoleplaySaveMessage(
      result.created
        ? `已保存自然回答，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : "这句自然回答已经在复习系统里。"
    );
  }

  function handleSaveRoleplayExpression(expression: string) {
    const lastEntry = roleplayTranscript.at(-1);
    const key = createRoleplaySaveKey("expression", expression);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: `角色扮演：${roleplayScenario.title}`,
      prompt: roleplayScenario.goal,
      originalText: roleplayFeedback?.originalReply ?? "",
      correctedText: roleplayFeedback?.naturalReply ?? expression,
      text: expression,
      meaningZh: "场景口语高频表达",
      example: lastEntry?.learnerText || roleplayFeedback?.naturalReply || expression
    });

    markRoleplayItemSaved(key);
    setRoleplaySaveMessage(
      result.created
        ? `已保存表达“${expression}”，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : `表达“${expression}”已经在复习系统里。`
    );
  }

  function createRoleplayAiSaveKey(kind: "corrected-sentence" | "expression", text: string) {
    return `roleplay-ai:${kind}:${text.trim().toLowerCase()}`;
  }

  function markRoleplayAiItemSaved(key: string) {
    setSavedRoleplayAiKeys((current) => ({
      ...current,
      [key]: true
    }));
  }

  async function handleCorrectRoleplayWithAi() {
    const lastEntry = roleplayTranscript.at(-1);

    if (!lastEntry) {
      setRoleplayMessage("请先提交一句角色扮演回答，再请求 AI 自然度反馈。");
      return;
    }

    setIsCorrectingRoleplay(true);
    setRoleplayMessage("正在生成 AI 角色回答反馈...");

    try {
      const requestPayload = {
        promptTitle: `角色扮演：${roleplayScenario.title}`,
        prompt: `${roleplayScenario.setting}\n前台：${lastEntry.partnerText}\n你的目标：${roleplayScenario.goal}`,
        level: roleplayScenario.level,
        userText: lastEntry.learnerText
      };
      const result = await requestAiJsonWithQueue<{
        correction?: AiWritingCorrection;
        error?: string;
      }>({
        kind: "correct-writing",
        endpoint: "/api/ai/correct-writing",
        payload: requestPayload,
        errorMessage: "AI 角色回答反馈生成失败。"
      });

      if (result.queued) {
        setRoleplayMessage(
          `AI 角色回答反馈暂不可用，已加入本地队列。稍后恢复网络后可重新点击。队列记录：${result.queueItem.id.slice(-8)}`
        );
        return;
      }

      const payload = result.payload;

      if (!payload.correction) {
        throw new Error(payload.error ?? "AI 角色回答反馈生成失败。");
      }

      recordStudyActivity({
        type: "ai",
        label: `AI 角色回答反馈：${roleplayScenario.title}`,
        materialTitle: roleplayScenario.material
      });
      setRoleplayAiCorrection(payload.correction);
      setRoleplayAiSaveMessage("");
      setSavedRoleplayAiKeys({});
      setRoleplayMessage(
        payload.correction.source === "model"
          ? `已由 ${payload.correction.provider} 生成角色回答反馈。`
          : "当前使用本地降级角色回答反馈，配置 AI 后会调用模型。"
      );
    } catch (error) {
      setRoleplayMessage(error instanceof Error ? error.message : "AI 角色回答反馈生成失败。");
    } finally {
      setIsCorrectingRoleplay(false);
    }
  }

  function handleSaveRoleplayAiCorrection() {
    if (!roleplayAiCorrection) {
      return;
    }

    const lastEntry = roleplayTranscript.at(-1);
    const key = createRoleplayAiSaveKey("corrected-sentence", roleplayAiCorrection.correctedText);
    const result = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: `角色扮演：${roleplayScenario.title}`,
      prompt: lastEntry?.partnerText ?? roleplayScenario.goal,
      originalText: roleplayAiCorrection.originalText,
      correctedText: roleplayAiCorrection.correctedText,
      text: roleplayAiCorrection.correctedText,
      meaningZh: "AI 优化后的角色回答",
      example: lastEntry
        ? `Front desk: ${lastEntry.partnerText} / Me: ${roleplayAiCorrection.correctedText}`
        : roleplayAiCorrection.correctedText
    });

    markRoleplayAiItemSaved(key);
    setRoleplayAiSaveMessage(
      result.created
        ? `已保存 AI 优化角色回答，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : "这条 AI 优化角色回答已经在复习系统里。"
    );
  }

  function handleSaveRoleplayAiExpression(expression: AiSegmentExpression) {
    if (!roleplayAiCorrection) {
      return;
    }

    const key = createRoleplayAiSaveKey("expression", expression.text);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: `角色扮演：${roleplayScenario.title}`,
      prompt: roleplayScenario.goal,
      originalText: roleplayAiCorrection.originalText,
      correctedText: roleplayAiCorrection.correctedText,
      text: expression.text,
      meaningZh: expression.meaningZh,
      example: expression.example || roleplayAiCorrection.correctedText
    });

    markRoleplayAiItemSaved(key);
    setRoleplayAiSaveMessage(
      result.created
        ? `已保存表达“${expression.text}”，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : `表达“${expression.text}”已经在复习系统里。`
    );
  }

  function handleSaveAllRoleplayAiSuggestions() {
    if (!roleplayAiCorrection) {
      return;
    }

    const lastEntry = roleplayTranscript.at(-1);
    const result = saveAiCorrectionSuggestions({
      correction: roleplayAiCorrection,
      promptTitle: `角色扮演：${roleplayScenario.title}`,
      prompt: lastEntry?.partnerText ?? roleplayScenario.goal,
      correctedMeaningZh: "AI 优化后的角色回答",
      correctedExample: lastEntry
        ? `Front desk: ${lastEntry.partnerText} / Me: ${roleplayAiCorrection.correctedText}`
        : roleplayAiCorrection.correctedText,
      createKey: createRoleplayAiSaveKey
    });

    setSavedRoleplayAiKeys((current) => ({ ...current, ...result.savedKeys }));
    setRoleplayAiSaveMessage(
      result.created > 0
        ? `已一键保存 ${result.created}/${result.total} 个 AI 角色回答建议。`
        : "这些 AI 角色回答建议已经在复习系统里。"
    );
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
      const requestPayload = {
        promptTitle: prompt.title,
        prompt: prompt.prompt,
        level: prompt.level,
        userText: writingText
      };
      const result = await requestAiJsonWithQueue<{
        correction?: AiWritingCorrection;
        error?: string;
      }>({
        kind: "correct-writing",
        endpoint: "/api/ai/correct-writing",
        payload: requestPayload,
        errorMessage: "写作批改失败。"
      });

      if (result.queued) {
        setWritingMessage(
          `写作批改暂不可用，已加入本地 AI 请求队列。稍后恢复网络后可重新点击。队列记录：${result.queueItem.id.slice(-8)}`
        );
        return;
      }

      const payload = result.payload;

      if (!payload.correction) {
        throw new Error(payload.error ?? "写作批改失败。");
      }

      recordStudyActivity({
        type: "output",
        label: `短写作：${prompt.title}`,
        minutes: 1
      });
      setWritingCorrection(payload.correction);
      setWritingSaveMessage("");
      setSavedWritingKeys({});
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

  function createWritingSaveKey(kind: "corrected-sentence" | "expression", text: string) {
    return `${kind}:${text.trim().toLowerCase()}`;
  }

  function markWritingItemSaved(key: string) {
    setSavedWritingKeys((current) => ({
      ...current,
      [key]: true
    }));
  }

  function handleSaveCorrectedWriting() {
    if (!writingCorrection) {
      return;
    }

    const prompt = writingPrompts[selectedWritingIndex];
    const key = createWritingSaveKey("corrected-sentence", writingCorrection.correctedText);
    const result = saveWritingItemAsReviewCard({
      kind: "corrected-sentence",
      promptTitle: prompt.title,
      prompt: prompt.prompt,
      originalText: writingCorrection.originalText,
      correctedText: writingCorrection.correctedText,
      text: writingCorrection.correctedText,
      example: writingCorrection.correctedText
    });

    markWritingItemSaved(key);
    setWritingSaveMessage(
      result.created
        ? `已保存自然写法，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : "这条自然写法已经在复习系统里。"
    );
  }

  function handleSaveWritingExpression(expression: AiSegmentExpression) {
    if (!writingCorrection) {
      return;
    }

    const prompt = writingPrompts[selectedWritingIndex];
    const key = createWritingSaveKey("expression", expression.text);
    const result = saveWritingItemAsReviewCard({
      kind: "expression",
      promptTitle: prompt.title,
      prompt: prompt.prompt,
      originalText: writingCorrection.originalText,
      correctedText: writingCorrection.correctedText,
      text: expression.text,
      meaningZh: expression.meaningZh,
      example: expression.example || writingCorrection.correctedText
    });

    markWritingItemSaved(key);
    setWritingSaveMessage(
      result.created
        ? `已保存表达“${expression.text}”，并生成 ${result.cards?.length ?? 1} 张复习卡。`
        : `表达“${expression.text}”已经在复习系统里。`
    );
  }

  function handleSaveAllWritingSuggestions() {
    if (!writingCorrection) {
      return;
    }

    const prompt = writingPrompts[selectedWritingIndex];
    const result = saveAiCorrectionSuggestions({
      correction: writingCorrection,
      promptTitle: prompt.title,
      prompt: prompt.prompt,
      correctedMeaningZh: "AI 优化后的写作句子",
      correctedExample: writingCorrection.correctedText,
      createKey: createWritingSaveKey
    });

    setSavedWritingKeys((current) => ({ ...current, ...result.savedKeys }));
    setWritingSaveMessage(
      result.created > 0
        ? `已一键保存 ${result.created}/${result.total} 个写作建议。`
        : "这些写作建议已经在复习系统里。"
    );
  }

  async function startRecording(mode: RecordingMode) {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (mode === "retelling") {
        setRetellingMessage("当前浏览器不支持录音。");
      } else {
        setMessage("当前浏览器不支持录音。");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = getTimestampMs();
      setRecordingMode(mode);
      setElapsedSeconds(0);
      if (mode === "retelling") {
        setRetellingAudioUrl("");
        setRetellingTranscriptSource("");
        setIsRetellingTranscribing(false);
        setRetellingFeedback(null);
        setRetellingMessage("");
        setRetellingSaveMessage("");
        setSavedRetellingKeys({});
        setRetellingAiCorrection(null);
        setRetellingAiSaveMessage("");
        setSavedRetellingAiKeys({});
      } else {
        setAudioUrl("");
        setTranscript("");
        setTranscriptSource("");
        setIsTranscribing(false);
        setFeedback(null);
        setPronunciationScore(null);
        setIsScoringPronunciation(false);
        setMessage("");
      }
      transcriptRef.current = "";

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        void handleRecordingStopped(recorder, stream, mode);
      });

      recorder.start();
      startSpeechRecognition(mode);
      setIsRecording(true);
    } catch {
      if (mode === "retelling") {
        setRetellingMessage("无法打开麦克风，请检查浏览器权限。");
      } else {
        setMessage("无法打开麦克风，请检查浏览器权限。");
      }
    }
  }

  async function requestCloudTranscription(blob: Blob, prompt: string, fileName: string) {
    const file = new File([blob], fileName, {
      type: blob.type || "audio/webm"
    });
    const formData = new FormData();
    formData.set("file", file);
    formData.set("language", "en");
    formData.set("prompt", prompt);

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

  async function requestPronunciationScoring(blob: Blob, referenceText: string, transcriptText: string) {
    const file = new File([blob], "shadowing.webm", {
      type: blob.type || "audio/webm"
    });
    const formData = new FormData();
    formData.set("file", file);
    formData.set("referenceText", referenceText);
    formData.set("transcript", transcriptText);

    const response = await fetch("/api/speech/pronunciation-score", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as {
      pronunciation?: PronunciationScoringResult;
      error?: string;
    };

    if (!response.ok || !payload.pronunciation) {
      throw new Error(payload.error ?? "音频级发音评分失败。");
    }

    return payload.pronunciation;
  }

  async function handleRecordingStopped(
    recorder: MediaRecorder,
    stream: MediaStream,
    mode: RecordingMode
  ) {
    const durationSeconds = Math.max(1, Math.floor((getTimestampMs() - startedAtRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    const nextAudioUrl = URL.createObjectURL(blob);
    let finalTranscript = transcriptRef.current.trim();
    let finalTranscriptSource: TranscriptSource | undefined = finalTranscript ? "browser" : undefined;

    if (mode === "retelling") {
      setIsRetellingTranscribing(true);
    } else {
      setIsTranscribing(true);
    }

    try {
      const cloudTranscription = await requestCloudTranscription(
        blob,
        mode === "retelling" ? retellingPractice.prompt : todayPractice.prompt,
        mode === "retelling" ? "retelling.webm" : "shadowing.webm"
      );

      if (cloudTranscription.text.trim()) {
        finalTranscript = cloudTranscription.text.trim();
        finalTranscriptSource = cloudTranscription.source === "local" ? "local" : "cloud";
      } else if (cloudTranscription.error && !finalTranscript) {
        if (mode === "retelling") {
          setRetellingMessage(`服务端转写未启用：${cloudTranscription.error}`);
        } else {
          setMessage(`服务端转写未启用：${cloudTranscription.error}`);
        }
      }
    } catch (error) {
      if (!finalTranscript) {
        if (mode === "retelling") {
          setRetellingMessage(error instanceof Error ? error.message : "云端转写失败。");
        } else {
          setMessage(error instanceof Error ? error.message : "云端转写失败。");
        }
      }
    } finally {
      if (mode === "retelling") {
        setIsRetellingTranscribing(false);
      } else {
        setIsTranscribing(false);
      }
    }

    if (mode === "retelling") {
      const nextFeedback = finalTranscript
        ? createRetellingFeedback({
            transcript: finalTranscript,
            keyPoints: retellingPractice.keyPoints,
            usefulWords: retellingPractice.usefulWords
          })
        : null;
      const attempt = addPracticeAttempt({
        type: "retelling",
        prompt: retellingPractice.prompt,
        materialTitle: retellingPractice.material,
        durationSeconds,
        transcript: finalTranscript || undefined,
        transcriptSource: finalTranscriptSource,
        score: nextFeedback?.score,
        feedback: nextFeedback?.tip
      });

      recordStudyActivity({
        type: "output",
        label: `录音复述：${retellingPractice.title}`,
        minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
        materialTitle: retellingPractice.material
      });
      setRetellingAudioUrl(nextAudioUrl);
      if (finalTranscript) {
        setRetellingText(finalTranscript);
      }
      setRetellingTranscriptSource(finalTranscript ? finalTranscriptSource ?? "" : "");
      setRetellingFeedback(nextFeedback);
      setRetellingSaveMessage("");
      setSavedRetellingKeys({});
      setRetellingAiCorrection(null);
      setRetellingAiSaveMessage("");
      setSavedRetellingAiKeys({});
      setAttempts([attempt, ...loadPracticeAttempts().filter((item) => item.id !== attempt.id)]);
      setRetellingMessage(
        finalTranscript
          ? `已保存本次录音复述和${getTranscriptSourceLabel(finalTranscriptSource ?? "browser")}。`
          : "已保存本次录音复述记录。"
      );
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecordingMode("");
      return;
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
    setPronunciationScore(null);
    setAttempts([attempt, ...loadPracticeAttempts().filter((item) => item.id !== attempt.id)]);
    setMessage(
      finalTranscript
        ? `已保存本次跟读和${getTranscriptSourceLabel(finalTranscriptSource ?? "browser")}。`
        : "已保存本次跟读记录。"
    );
    stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecordingMode("");

    if (finalTranscript) {
      setIsScoringPronunciation(true);

      try {
        const scoring = await requestPronunciationScoring(blob, todayPractice.prompt, finalTranscript);
        setPronunciationScore(scoring);

        if (scoring.source === "local") {
          setMessage(`已保存本次跟读，并完成音频级发音评分：${scoring.score ?? "-"}%。`);
        } else if (scoring.error) {
          setMessage(`已保存本次跟读。音频级发音评分未启用：${scoring.error}`);
        }
      } catch (error) {
        setPronunciationScore({
          source: "fallback",
          provider: "发音评分请求失败",
          wordScores: [],
          phonemeFocus: [],
          error: error instanceof Error ? error.message : "音频级发音评分失败。"
        });
      } finally {
        setIsScoringPronunciation(false);
      }
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  function startSpeechRecognition(mode: RecordingMode) {
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
      if (mode === "retelling") {
        setRetellingText(transcriptRef.current);
      } else {
        setTranscript(transcriptRef.current);
      }
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

  const isShadowingRecording = isRecording && recordingMode === "shadowing";
  const isRetellingRecording = isRecording && recordingMode === "retelling";
  const allRoleplayTurns: PracticeRoleplayTurn[] = [...roleplayScenario.turns, ...dynamicRoleplayTurns];
  const currentRoleplayTurn = allRoleplayTurns[roleplayTurnIndex] ?? allRoleplayTurns[0];
  const roleplayCompleted = roleplayTranscript.length >= allRoleplayTurns.length;
  const roleplayProgressLabel = `${Math.min(roleplayTranscript.length + 1, allRoleplayTurns.length)}/${allRoleplayTurns.length}`;
  const roleplaySessionSummary = summarizeRoleplaySession({
    scenarioTitle: roleplayScenario.title,
    goal: roleplayScenario.goal,
    totalTurns: allRoleplayTurns.length,
    entries: roleplayTranscript
  });
  const roleplayMemory = summarizeRoleplayMemory(attempts, roleplayScenario.title);
  const roleplayGoalTracker = trackRoleplayGoal(attempts, roleplayScenario.title);
  const roleplayTransferPlan = createRoleplayTransferPlan(roleplayMemory);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
      <section id="practice-shadowing" className="grid min-w-0 scroll-mt-24 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="min-w-0">
          <CardHeader className="pb-4">
            <Badge variant="soft" className="w-fit">
              练习
            </Badge>
            <CardTitle className="text-2xl">输出能力训练台</CardTitle>
            <CardDescription className="max-w-3xl">
            输出不追求多，而是紧跟今天已经听懂读懂的材料：先跟读，再复述，最后写一两句。
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">

          <div className="min-w-0 rounded-lg border border-foreground/15 bg-panel-strong p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <Badge variant="default">今日推荐</Badge>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{todayPractice.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{todayPractice.target}</p>
              </div>
              <Button
                onClick={() => void playPrompt()}
                className="w-full shrink-0 md:w-auto"
              >
                <Volume2 className="h-4 w-4" />
                播放原句
              </Button>
            </div>
            <p className="mt-4 break-words rounded-lg border border-border bg-white p-3 text-base font-semibold leading-7 text-foreground">
              {todayPractice.prompt}
            </p>

            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="text-sm font-medium text-muted">录音计时</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {isShadowingRecording ? formatSeconds(elapsedSeconds) : "0:00"}
                </p>
              </div>
              {isShadowingRecording ? (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                  className="w-full sm:w-auto"
                >
                  <Square className="h-4 w-4" />
                  停止录音
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => startRecording("shadowing")}
                  disabled={isRecording}
                  className="w-full sm:w-auto"
                >
                  <Mic className="h-4 w-4" />
                  开始录音
                </Button>
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
                  {transcriptSource ? getTranscriptSourceLabel(transcriptSource) : "浏览器转写"}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{transcript}</p>
              </div>
            ) : null}

            {isTranscribing ? (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                正在请求服务端转写...
              </p>
            ) : null}

            {feedback ? (
              <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{feedback.label}</p>
                  <p className="text-sm font-semibold text-foreground">{feedback.score}%</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">{feedback.tip}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-white px-3 py-2">
                    <p className="text-xs text-foreground">完整度</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {feedback.matchedWords}/{feedback.totalWords}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-white px-3 py-2">
                    <p className="text-xs text-foreground">疑似多出</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {feedback.extraWords.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-white px-3 py-2">
                    <p className="text-xs text-foreground">重点词</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {feedback.focusWords.slice(0, 2).join(", ") || "继续保持"}
                    </p>
                  </div>
                </div>
                {feedback.missingWords.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-foreground">
                    漏掉：{feedback.missingWords.join(", ")}
                  </p>
                ) : null}
                {feedback.extraWords.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-foreground">
                    多出/误识别：{feedback.extraWords.join(", ")}
                  </p>
                ) : null}
                {feedback.pronunciationFocus.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {feedback.pronunciationFocus.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{item.label}</p>
                          <span className="text-xs text-muted">{item.sound}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-foreground">{item.words.join(", ")}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{item.tip}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {feedback.suggestions.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-foreground">
                    {feedback.suggestions.slice(0, 2).map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {isScoringPronunciation ? (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                正在请求音频级发音评分...
              </p>
            ) : null}

            {pronunciationScore ? (
              <div className="mt-4 rounded-lg border border-border bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">音频级发音评分</p>
                  <Badge variant={pronunciationScore.source === "local" ? "default" : "outline"}>
                    {pronunciationScore.source === "local" ? `${pronunciationScore.score ?? "-"}%` : "未配置"}
                  </Badge>
                </div>
                {pronunciationScore.source === "local" ? (
                  <>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs text-muted">发音</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {pronunciationScore.pronunciationScore ?? "-"}%
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs text-muted">流利度</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {pronunciationScore.fluencyScore ?? "-"}%
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs text-muted">对齐</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {pronunciationScore.alignmentScore ?? "-"}%
                        </p>
                      </div>
                    </div>
                    {pronunciationScore.feedbackZh ? (
                      <p className="mt-3 text-sm leading-6 text-muted">{pronunciationScore.feedbackZh}</p>
                    ) : null}
                    {pronunciationScore.wordScores.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pronunciationScore.wordScores.slice(0, 6).map((item) => (
                          <Badge key={`${item.word}-${item.score}`} variant="outline">
                            {item.word} {item.score}%
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {pronunciationScore.error ?? "配置本地发音评分 endpoint 后，这里会显示音频强制对齐结果。"}
                  </p>
                )}
              </div>
            ) : null}

            {message ? (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                {message}
              </p>
            ) : null}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">跟读步骤</CardTitle>
            {isShadowingRecording ? <MicOff className="h-5 w-5 text-foreground" /> : <Mic className="h-5 w-5 text-foreground" />}
          </div>
          <CardDescription>先低压力模仿，不急着自由发挥。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayPractice.steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-strong text-sm font-semibold text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <Card key={mode.id}>
              <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel-strong text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="outline">
                  {mode.status}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{mode.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
              <div className="mt-4 rounded-lg bg-panel-strong p-3">
                <p className="text-sm font-semibold text-foreground">{mode.todayTask}</p>
                <p className="mt-1 text-xs text-muted">
                  {mode.estimatedMinutes} 分钟 · {mode.output}
                </p>
              </div>
              <Button variant="outline" className="mt-5 w-full" onClick={() => handleOpenPracticeMode(mode.id)}>
                进入
              </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {materialDrills.length > 0 ? (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="soft">材料裂变练习</Badge>
                <CardTitle className="mt-3 text-lg">{currentMaterial?.title ?? "当前材料"}</CardTitle>
              </div>
              <ClipboardCheck className="h-5 w-5 text-foreground" />
            </div>
            <CardDescription>
              当前材料已自动拆成 {materialDrills.length} 个微练习，先做短题，再进入对应训练模块。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {materialDrills.map((drill) => (
                <Link
                  key={drill.id}
                  href={drill.href}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-white p-4 transition hover:bg-panel-strong"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{drill.estimatedMinutes} 分钟</Badge>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{drill.title}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{drill.instruction}</p>
                  </div>
                  <p className="min-w-0 break-words rounded-lg bg-panel-strong px-3 py-2 text-xs leading-5 text-foreground">
                    {drill.prompt}
                  </p>
                  {drill.answerHints.length > 0 ? (
                    <p className="text-xs leading-5 text-muted">
                      提示：{drill.answerHints.slice(0, 3).join(" / ")}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="soft">AI 练习生成</Badge>
                <CardTitle className="mt-3 text-lg">从当前材料继续生成题目</CardTitle>
              </div>
              <Button onClick={() => void handleGeneratePracticeSet()} disabled={isGeneratingPracticeSet}>
                <Plus className="h-4 w-4" />
                {isGeneratingPracticeSet ? "生成中..." : "生成更多练习"}
              </Button>
            </div>
            <CardDescription>
              基于当前材料生成填空、问答、写作、角色准备等题目；保存后会进入练习题库和 SRS 队列。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {practiceGenerationMessage ? (
              <p className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                {practiceGenerationMessage}
              </p>
            ) : null}
            {generatedPracticeSet ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel-strong p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {generatedPracticeSet.materialTitle} · {generatedPracticeSet.drills.length} 道题
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">{generatedPracticeSet.focus}</p>
                  </div>
                  <Button variant="outline" onClick={handleSaveGeneratedPracticeSet}>
                    <Plus className="h-4 w-4" />
                    加入题库
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {generatedPracticeSet.drills.map((drill, index) => (
                    <article key={`${drill.type}-${drill.prompt}-${index}`} className="rounded-lg border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge variant="outline">{drill.type}</Badge>
                          <h3 className="mt-2 text-sm font-semibold text-foreground">{drill.title}</h3>
                        </div>
                        <span className="text-xs text-muted">{drill.estimatedMinutes} 分钟</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{drill.instruction}</p>
                      <p className="mt-3 break-words rounded-lg bg-panel-strong p-3 text-sm leading-6 text-foreground">
                        {drill.prompt}
                      </p>
                      {drill.hints.length > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-muted">提示：{drill.hints.join(" / ")}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-border bg-white p-4 text-sm leading-6 text-muted">
                当前还没有生成的 AI 练习。点击“生成更多练习”后，可以把题目保存到题库。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge variant="soft">练习题库</Badge>
                <CardTitle className="mt-3 text-lg">到期练习队列</CardTitle>
              </div>
              <Badge variant="outline">{practiceQuestionCount} 题</Badge>
            </div>
            <CardDescription>
              保存的生成题会按 SRS 调度。做完一题后按难度评分，系统会安排下次出现时间。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {duePracticeQuestions.length > 0 ? (
              duePracticeQuestions.map((question) => (
                <article key={question.id} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline">{question.type}</Badge>
                      <h3 className="mt-2 text-sm font-semibold text-foreground">{question.title}</h3>
                    </div>
                    <span className="text-xs text-muted">{question.level}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{question.instruction}</p>
                  <p className="mt-3 break-words rounded-lg bg-panel-strong p-3 text-sm leading-6 text-foreground">
                    {question.prompt}
                  </p>
                  <details className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-foreground">查看答案和解释</summary>
                    <p className="mt-2 text-sm leading-6 text-foreground">{question.answer}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{question.explanationZh}</p>
                  </details>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["again", "重来"],
                      ["hard", "困难"],
                      ["good", "顺利"],
                      ["easy", "简单"]
                    ].map(([rating, label]) => (
                      <Button
                        key={rating}
                        variant={rating === "good" || rating === "easy" ? "soft" : "outline"}
                        size="sm"
                        onClick={() =>
                          handleReviewPracticeQuestion(
                            question,
                            rating as "again" | "hard" | "good" | "easy"
                          )
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-border bg-white p-4 text-sm leading-6 text-muted">
                暂无到期练习题。先生成并加入题库，或稍后按 SRS 到期后再回来练。
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card id="practice-roleplay" className="min-w-0 scroll-mt-24 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Badge variant="soft">场景口语</Badge>
              <CardTitle className="mt-3 text-lg">{roleplayScenario.title}</CardTitle>
            </div>
            <Headphones className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>
            {roleplayScenario.setting} · {roleplayScenario.goal}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-3">
              <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">角色设定</p>
                  <Badge variant="outline">{roleplayScenario.level}</Badge>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{roleplayScenario.learnerRole}</p>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{roleplayScenario.partnerRole}</p>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-foreground" />
                    <p className="text-sm font-semibold text-foreground">目标跟踪</p>
                  </div>
                  <Badge variant={roleplayGoalTracker.achieved ? "default" : "outline"}>
                    目标 {roleplayGoalTracker.targetScore}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-strong">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${roleplayGoalTracker.progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">最佳完成度</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplayGoalTracker.attempts > 0 ? `${roleplayGoalTracker.currentBest}%` : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">最近一次</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplayGoalTracker.attempts > 0 ? `${roleplayGoalTracker.latestScore}%` : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">连续达标</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{roleplayGoalTracker.streak}</p>
                  </div>
                </div>
                <p className="mt-3 break-words rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm leading-6 text-foreground">
                  {roleplayGoalTracker.nextGoalLabel}
                </p>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">长期记忆</p>
                  <Badge variant={roleplayMemory.sessionCount > 0 ? "outline" : "soft"}>
                    {roleplayMemory.trendLabel}
                  </Badge>
                </div>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">历史次数</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{roleplayMemory.sessionCount}</p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">历史均分</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplayMemory.sessionCount > 0 ? `${roleplayMemory.averageScore}%` : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">上次练习</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatShortDate(roleplayMemory.lastPracticedAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 break-words rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm leading-6 text-foreground">
                  {roleplayMemory.nextGoal}
                </p>
                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">已经沉淀</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                      {roleplayMemory.masteredSignals.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">继续补强</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                      {roleplayMemory.focusAreas.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">跨场景迁移</p>
                  <Badge variant={roleplayTransferPlan.shouldTransfer ? "default" : "outline"}>
                    {roleplayTransferPlan.readinessLabel}
                  </Badge>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{roleplayTransferPlan.principle}</p>
                <div className="mt-3 grid min-w-0 gap-2">
                  {roleplayTransferPlan.targets.map((target) => (
                    <div key={target.id} className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{target.title}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-muted">{target.setting}</p>
                        </div>
                        {target.lockedReason ? <Badge variant="outline">待解锁</Badge> : <Badge variant="soft">可迁移</Badge>}
                      </div>
                      <p className="mt-2 break-words text-xs leading-5 text-foreground">{target.transferTask}</p>
                      <p className="mt-2 break-words rounded-lg border border-border bg-white p-2 text-xs leading-5 text-foreground">
                        {target.suggestedOpening}
                      </p>
                      {target.lockedReason ? (
                        <p className="mt-2 text-xs leading-5 text-muted">{target.lockedReason}</p>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-muted">
                          成功标准：{target.successCriteria.join(" / ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                  <p className="text-xs font-semibold text-foreground">迁移时保留</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                    {roleplayTransferPlan.carryOverSkills.slice(0, 3).map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-4">
                <p className="text-sm font-semibold text-foreground">可保存高频表达</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleplayScenario.usefulExpressions.map((expression) => {
                    const key = createRoleplaySaveKey("expression", expression);

                    return (
                      <Button
                        key={expression}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveRoleplayExpression(expression)}
                        disabled={savedRoleplayKeys[key]}
                        className="h-auto min-h-8 max-w-full whitespace-normal break-words text-left text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 text-foreground" />
                        {savedRoleplayKeys[key] ? "已保存" : expression}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {roleplayTranscript.length > 0 ? (
                <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-foreground">本轮对话记录</p>
                  <div className="mt-3 space-y-3">
                    {roleplayTranscript.map((entry, index) => (
                      <div key={`${entry.turnId}-${index}`} className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs text-muted">Front desk</p>
                        <p className="mt-1 break-words text-sm leading-6 text-foreground">{entry.partnerText}</p>
                        <p className="mt-2 text-xs text-muted">Me · {entry.score}%</p>
                        <p className="mt-1 break-words text-sm leading-6 text-foreground">{entry.learnerText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="min-w-0 rounded-lg border border-border bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">会话目标和总结</p>
                  <Badge variant={roleplayCompleted ? "default" : "outline"}>
                    {roleplayCompleted ? roleplaySessionSummary.levelLabel : "进行中"}
                  </Badge>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{roleplaySessionSummary.summaryZh}</p>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">完成轮次</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplaySessionSummary.completedTurns}/{roleplaySessionSummary.totalTurns}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">平均完成度</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplaySessionSummary.completedTurns > 0 ? `${roleplaySessionSummary.averageScore}%` : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">场景完成率</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleplaySessionSummary.completionRate}%
                    </p>
                  </div>
                </div>
                {roleplayTranscript.length > 0 ? (
                  <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">已经做到</p>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                        {roleplaySessionSummary.strengths.slice(0, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">下一步补强</p>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                        {roleplaySessionSummary.focusAreas.slice(0, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">下次目标</p>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                        {roleplaySessionSummary.nextPractice.slice(0, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">第 {roleplayProgressLabel} 轮</Badge>
                    {currentRoleplayTurn.isAiGenerated ? <Badge variant="soft">AI 追问</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">Front desk</p>
                  <p className="mt-2 break-words rounded-lg border border-border bg-panel-strong p-3 text-base font-semibold leading-7 text-foreground">
                    {currentRoleplayTurn.partnerLine}
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-muted">{currentRoleplayTurn.translation}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handlePlayRoleplayPartnerLine()}
                  disabled={roleplayCompleted}
                  className="shrink-0"
                >
                  <Volume2 className="h-4 w-4" />
                  播放台词
                </Button>
              </div>

              <Separator className="my-4" />

              <p className="text-sm font-semibold text-foreground">你的任务</p>
              <p className="mt-2 text-sm leading-6 text-muted">{currentRoleplayTurn.userGoalZh}</p>
              <div className="mt-3 grid gap-2">
                {currentRoleplayTurn.suggestedReplies.map((reply) => (
                  <Button
                    key={reply}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal p-3 text-left"
                    onClick={() => handleUseRoleplaySuggestedReply(reply)}
                    disabled={roleplayCompleted}
                  >
                    {reply}
                  </Button>
                ))}
              </div>

              <Textarea
                value={roleplayReply}
                onChange={(event) => {
                  setRoleplayReply(event.target.value);
                  setRoleplayMessage("");
                }}
                disabled={roleplayCompleted}
                className="mt-4 min-h-28"
                placeholder="Type your reply in simple English..."
              />

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button onClick={handleSubmitRoleplayReply} disabled={roleplayCompleted}>
                  <ClipboardCheck className="h-4 w-4" />
                  提交回答
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleGenerateNextRoleplayTurn()}
                  disabled={!roleplayCompleted || isGeneratingRoleplayTurn}
                >
                  <Headphones className="h-4 w-4" />
                  {isGeneratingRoleplayTurn ? "生成中..." : "AI 继续追问"}
                </Button>
                <Button variant="outline" onClick={handleResetRoleplay}>
                  重新开始
                </Button>
              </div>

              {roleplayMessage ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                  {roleplayMessage}
                </p>
              ) : null}

              {roleplayFeedback ? (
                <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{roleplayFeedback.label}</p>
                    <p className="text-sm font-semibold text-foreground">{roleplayFeedback.score}%</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{roleplayFeedback.tip}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-white p-3">
                      <p className="text-xs font-medium text-foreground">已说出</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {roleplayFeedback.matchedKeywords.join("、") || "继续补充"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white p-3">
                      <p className="text-xs font-medium text-foreground">待补充</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {roleplayFeedback.missingKeywords.join("、") || "关键信息完整"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground">
                    更自然说法：{roleplayFeedback.naturalReply}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-foreground">
                    {roleplayFeedback.suggestions.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleSaveRoleplayNaturalReply}
                    disabled={savedRoleplayKeys[createRoleplaySaveKey("natural-reply", roleplayFeedback.naturalReply)]}
                  >
                    <Plus className="h-4 w-4 text-foreground" />
                    {savedRoleplayKeys[createRoleplaySaveKey("natural-reply", roleplayFeedback.naturalReply)]
                      ? "已保存自然回答"
                      : "保存自然回答"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-0 mt-2 sm:ml-2 sm:mt-3"
                    onClick={() => void handleCorrectRoleplayWithAi()}
                    disabled={isCorrectingRoleplay}
                  >
                    <PenLine className="h-4 w-4 text-foreground" />
                    {isCorrectingRoleplay ? "生成中..." : "AI 自然度反馈"}
                  </Button>
                </div>
              ) : null}

              {roleplayAiCorrection ? (
                <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-foreground">AI 角色回答反馈</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveRoleplayAiCorrection}
                        disabled={
                          savedRoleplayAiKeys[
                            createRoleplayAiSaveKey("corrected-sentence", roleplayAiCorrection.correctedText)
                          ]
                        }
                      >
                        <Plus className="h-4 w-4 text-foreground" />
                        {savedRoleplayAiKeys[
                          createRoleplayAiSaveKey("corrected-sentence", roleplayAiCorrection.correctedText)
                        ]
                          ? "已保存"
                          : "保存修正版"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSaveAllRoleplayAiSuggestions}>
                        全部保存
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground">
                    {roleplayAiCorrection.correctedText}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{roleplayAiCorrection.feedbackZh}</p>
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-foreground">
                    {roleplayAiCorrection.keyProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-2">
                    {roleplayAiCorrection.betterExpressions.map((expression) => (
                      <div
                        key={expression.text}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{expression.meaningZh}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveRoleplayAiExpression(expression)}
                          disabled={savedRoleplayAiKeys[createRoleplayAiSaveKey("expression", expression.text)]}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 text-foreground" />
                          {savedRoleplayAiKeys[createRoleplayAiSaveKey("expression", expression.text)]
                            ? "已保存"
                            : "保存"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {roleplayAiSaveMessage ? (
                    <p className="mt-3 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground">
                      {roleplayAiSaveMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {roleplaySaveMessage ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                  {roleplaySaveMessage}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="practice-retelling" className="scroll-mt-24">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="soft">复述</Badge>
              <CardTitle className="mt-3 text-lg">{retellingPractice.title}</CardTitle>
            </div>
            <ClipboardCheck className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>{retellingPractice.prompt}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">原材料大意</p>
                <p className="mt-2 text-sm leading-6 text-muted">{retellingPractice.sourceSummary}</p>
              </div>
              <div className="grid gap-2">
                {retellingPractice.starters.map((starter) => (
                  <Button
                    key={starter}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal p-3 text-left"
                    onClick={() => handleUseRetellingStarter(starter)}
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-4">
              <Textarea
                value={retellingText}
                onChange={(event) => {
                  setRetellingText(event.target.value);
                  setRetellingMessage("");
                }}
                className="min-h-32"
                placeholder="Retell it in simple English..."
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="rounded-lg border border-border bg-panel-strong p-3">
                  <p className="text-sm font-medium text-muted">复述录音计时</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {isRetellingRecording ? formatSeconds(elapsedSeconds) : "0:00"}
                  </p>
                </div>
                {isRetellingRecording ? (
                  <Button variant="destructive" onClick={stopRecording}>
                    <Square className="h-4 w-4" />
                    停止复述录音
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => startRecording("retelling")}
                    disabled={isRecording}
                  >
                    <Mic className="h-4 w-4 text-foreground" />
                    录音复述
                  </Button>
                )}
              </div>
              {retellingAudioUrl ? (
                <audio className="mt-3 w-full" controls src={retellingAudioUrl}>
                  <track kind="captions" />
                </audio>
              ) : null}
              {retellingTranscriptSource ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-muted">
                  {getTranscriptSourceLabel(retellingTranscriptSource)}已填入上方文本框。
                </p>
              ) : null}
              {isRetellingTranscribing ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                  正在请求服务端转写复述录音...
                </p>
              ) : null}
              <Button onClick={handleEvaluateRetelling} className="mt-3 w-full">
                <ClipboardCheck className="h-4 w-4" />
                保存并反馈复述
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleCorrectRetellingWithAi()}
                disabled={isCorrectingRetelling}
                className="mt-2 w-full"
              >
                <PenLine className="h-4 w-4" />
                {isCorrectingRetelling ? "生成中..." : "AI 自然度反馈"}
              </Button>
              {retellingMessage ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                  {retellingMessage}
                </p>
              ) : null}

              <div className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-foreground">沉淀到复习</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveRetellingSentence}
                    disabled={savedRetellingKeys[createRetellingSaveKey("sentence", retellingText)]}
                  >
                    <Plus className="h-4 w-4 text-foreground" />
                    {savedRetellingKeys[createRetellingSaveKey("sentence", retellingText)]
                      ? "已保存复述句"
                      : "保存复述句"}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {retellingPractice.usefulWords.map((word) => {
                    const key = createRetellingSaveKey("expression", word);

                    return (
                      <Button
                        key={word}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveRetellingExpression(word)}
                        disabled={savedRetellingKeys[key]}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 text-foreground" />
                        {savedRetellingKeys[key] ? "已保存" : word}
                      </Button>
                    );
                  })}
                </div>
                {retellingSaveMessage ? (
                  <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                    {retellingSaveMessage}
                  </p>
                ) : null}
              </div>

              {retellingFeedback ? (
                <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{retellingFeedback.label}</p>
                    <p className="text-sm font-semibold text-foreground">{retellingFeedback.score}%</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{retellingFeedback.tip}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-white p-3">
                      <p className="text-xs font-medium text-foreground">已覆盖</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {retellingFeedback.coveredPoints.join("、") || "继续补充"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white p-3">
                      <p className="text-xs font-medium text-foreground">待补充</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {retellingFeedback.missingPoints.join("、") || "已覆盖主要信息"}
                      </p>
                    </div>
                  </div>
                  {retellingFeedback.suggestions.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs leading-5 text-foreground">
                      {retellingFeedback.suggestions.map((suggestion) => (
                        <li key={suggestion}>{suggestion}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {retellingAiCorrection ? (
                <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-foreground">AI 自然度反馈</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveRetellingAiCorrection}
                        disabled={
                          savedRetellingAiKeys[
                            createRetellingAiSaveKey("corrected-sentence", retellingAiCorrection.correctedText)
                          ]
                        }
                      >
                        <Plus className="h-4 w-4 text-foreground" />
                        {savedRetellingAiKeys[
                          createRetellingAiSaveKey("corrected-sentence", retellingAiCorrection.correctedText)
                        ]
                          ? "已保存"
                          : "保存修正版"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSaveAllRetellingAiSuggestions}>
                        全部保存
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground">
                    {retellingAiCorrection.correctedText}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{retellingAiCorrection.feedbackZh}</p>
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-foreground">
                    {retellingAiCorrection.keyProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-2">
                    {retellingAiCorrection.betterExpressions.map((expression) => (
                      <div
                        key={expression.text}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{expression.meaningZh}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveRetellingAiExpression(expression)}
                          disabled={savedRetellingAiKeys[createRetellingAiSaveKey("expression", expression.text)]}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 text-foreground" />
                          {savedRetellingAiKeys[createRetellingAiSaveKey("expression", expression.text)]
                            ? "已保存"
                            : "保存"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {retellingAiSaveMessage ? (
                    <p className="mt-3 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground">
                      {retellingAiSaveMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">跟读记录</CardTitle>
            <Play className="h-5 w-5 text-foreground" />
          </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attempts.slice(0, 4).map((attempt) => (
              <div key={attempt.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{attempt.prompt}</p>
                  <Badge variant="outline" className="shrink-0">
                    {getPracticeAttemptTypeLabel(attempt.type)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {attempt.materialTitle} · {formatSeconds(attempt.durationSeconds)}
                </p>
                {attempt.transcript ? (
                  <p className="mt-2 text-xs leading-5 text-muted">{attempt.transcript}</p>
                ) : null}
                {attempt.transcriptSource ? (
                  <p className="mt-2 text-xs text-muted">
                    {getTranscriptSourceLabel(attempt.transcriptSource)}
                  </p>
                ) : null}
                {typeof attempt.score === "number" ? (
                  <p className="mt-2 text-xs font-semibold text-foreground">跟读匹配度 {attempt.score}%</p>
                ) : null}
              </div>
            ))}
            {attempts.length === 0 ? (
              <p className="rounded-lg border border-border bg-white p-4 text-sm leading-6 text-muted">
                今天还没有跟读记录。
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">输出后会沉淀什么</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>每次练习都会变成可追踪、可复习的个人学习资产。</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {["录音记录", "浏览器转写", "复习卡"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">{item}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  本轮已接入
                </p>
              </div>
            ))}
          </div>
          <Separator className="my-5" />
          <Button asChild variant="outline">
            <Link href="/review">
              查看会进入复习的内容
              <ArrowRight className="h-4 w-4 text-foreground" />
            </Link>
          </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">AI 结果收件箱</CardTitle>
              <CardDescription>后台重试成功的写作、复述和角色练习结果会沉淀在这里。</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="soft">{aiResults.length} 条</Badge>
              {aiResults.length > 0 ? (
                <Button variant="outline" size="sm" onClick={handleClearAiResults}>
                  <Trash2 className="h-4 w-4" />
                  {confirmClearAiResults ? "确认清空" : "清空"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aiResultInboxMessage ? (
            <p className="mb-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
              {aiResultInboxMessage}
            </p>
          ) : null}
          {aiResults.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {aiResults.slice(0, 4).map((result) => {
                const correction = getAiResultCorrection(result);
                const turn = getAiResultTurn(result);
                const practiceSet = getAiResultPracticeSet(result);

                return (
                  <div key={result.id} className="rounded-lg border border-border bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Badge variant="outline">{getAiResultInboxTypeLabel(result.kind)}</Badge>
                        <p className="mt-2 break-words text-sm font-semibold text-foreground">{result.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleApplyAiResult(result)}>
                          载入
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSaveAiResultAsReviewCards(result)}>
                          {practiceSet ? "保存题" : "保存卡"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAiResult(result.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">{result.summary}</p>
                    {correction ? (
                      <div className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs font-semibold text-muted">反馈</p>
                        <p className="mt-1 text-sm leading-6 text-foreground">{correction.feedbackZh}</p>
                        {correction.betterExpressions.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {correction.betterExpressions.slice(0, 3).map((expression) => (
                              <Badge key={expression.text} variant="soft">
                                {expression.text}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {turn ? (
                      <div className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs font-semibold text-muted">建议回答</p>
                        <div className="mt-2 space-y-1">
                          {turn.suggestedReplies.slice(0, 2).map((reply) => (
                            <p key={reply} className="text-sm leading-6 text-foreground">
                              {reply}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {practiceSet ? (
                      <div className="mt-3 rounded-lg border border-border bg-panel-strong p-3">
                        <p className="text-xs font-semibold text-muted">练习集</p>
                        <p className="mt-1 text-sm leading-6 text-foreground">
                          {practiceSet.drills.length} 道题 · {practiceSet.focus}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm text-muted">
              <Inbox className="h-5 w-5 text-foreground" />
              暂无后台 AI 结果。
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="practice-writing" className="scroll-mt-24">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">短写作教练</CardTitle>
            <PenLine className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>从一句英文开始，先让 AI 帮你改成自然表达，再沉淀到复习卡。</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {writingPrompts.map((item, index) => (
                <Button
                  key={item.title}
                  variant={index === selectedWritingIndex ? "soft" : "outline"}
                  onClick={() => {
                    setSelectedWritingIndex(index);
                    setWritingCorrection(null);
                    setWritingMessage("");
                    setWritingSaveMessage("");
                    setSavedWritingKeys({});
                  }}
                  className="h-auto flex-col items-start justify-start p-3 text-left"
                >
                  <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted">{item.level}</span>
                </Button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">{writingPrompts[selectedWritingIndex].title}</h3>
                <Badge variant="soft">
                  {writingPrompts[selectedWritingIndex].level}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{writingPrompts[selectedWritingIndex].prompt}</p>
              <Textarea
                value={writingText}
                onChange={(event) => setWritingText(event.target.value)}
                className="mt-4 min-h-32"
                placeholder="Write your English sentence here..."
              />
              <Button
                onClick={handleCorrectWriting}
                disabled={isCorrectingWriting}
                className="mt-3 w-full"
              >
                <PenLine className="h-4 w-4" />
                {isCorrectingWriting ? "批改中..." : "AI 批改"}
              </Button>
              {writingMessage ? (
                <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-muted">更自然写法</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveCorrectedWriting}
                        disabled={savedWritingKeys[createWritingSaveKey("corrected-sentence", writingCorrection.correctedText)]}
                      >
                        <Plus className="h-4 w-4 text-foreground" />
                        {savedWritingKeys[createWritingSaveKey("corrected-sentence", writingCorrection.correctedText)]
                          ? "已保存"
                          : "保存复习卡"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSaveAllWritingSuggestions}>
                        全部保存
                      </Button>
                    </div>
                  </div>
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
                      <div
                        key={expression.text}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-panel-strong p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{expression.text}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{expression.meaningZh}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveWritingExpression(expression)}
                          disabled={savedWritingKeys[createWritingSaveKey("expression", expression.text)]}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 text-foreground" />
                          {savedWritingKeys[createWritingSaveKey("expression", expression.text)]
                            ? "已保存"
                            : "保存"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {writingSaveMessage ? (
                    <p className="mt-3 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
                      {writingSaveMessage}
                    </p>
                  ) : null}
                </section>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-panel-strong p-4 text-sm leading-6 text-muted">
                写一句英文后点击批改，系统会给出更自然写法、中文反馈和可保存表达。
              </p>
            )}
          </div>
        </div>
        </CardContent>
      </Card>
    </main>
  );
}
