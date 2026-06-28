import { resolveSpeechRuntimeConfig } from "@/lib/speech/server/transcribe-audio";
import { resolveTextToSpeechRuntimeConfig } from "@/lib/speech/server/synthesize-speech";
import { resolvePronunciationScoringConfig } from "@/lib/speech/server/pronunciation-score";

type Environment = Record<string, string | undefined>;

export type SpeechReadinessStatus = "local" | "cloud" | "fallback";

export type SpeechReadinessItem = {
  id: "stt" | "tts" | "pronunciation";
  label: string;
  status: SpeechReadinessStatus;
  provider: string;
  mode: string;
  detail: string;
  requiredEnv: string[];
};

export type LocalSpeechReadiness = {
  offlineReady: boolean;
  practiceReady: boolean;
  stt: SpeechReadinessItem;
  tts: SpeechReadinessItem;
  pronunciation: SpeechReadinessItem;
  nextSteps: string[];
};

function createSpeechItem(env: Environment): SpeechReadinessItem {
  const config = resolveSpeechRuntimeConfig(env);

  if (config.mode === "fallback") {
    return {
      id: "stt",
      label: "本地 Whisper / STT",
      status: "fallback",
      provider: config.reason,
      mode: config.mode,
      detail: "当前会回退到浏览器转写或空结果，尚未接入可用的本地语音识别服务。",
      requiredEnv: ["SPEECH_PROVIDER", "SPEECH_BASE_URL", "SPEECH_ENDPOINT_PATH"]
    };
  }

  if (config.mode === "local-multipart" || config.source === "local") {
    return {
      id: "stt",
      label: "本地 Whisper / STT",
      status: "local",
      provider: config.providerLabel,
      mode: config.mode,
      detail: "已配置本地语音识别 endpoint，后续可围绕该 endpoint 打包 whisper.cpp 或本地 Whisper 服务。",
      requiredEnv: ["SPEECH_PROVIDER", "SPEECH_BASE_URL", "SPEECH_ENDPOINT_PATH"]
    };
  }

  return {
    id: "stt",
    label: "云端 STT",
    status: "cloud",
    provider: config.providerLabel,
    mode: config.mode,
    detail: "已配置云端语音识别，可正常转写，但还不是离线方案。",
    requiredEnv: ["SPEECH_PROVIDER", "SPEECH_BASE_URL", "SPEECH_MODEL", "SPEECH_API_KEY"]
  };
}

function createTtsItem(env: Environment): SpeechReadinessItem {
  const config = resolveTextToSpeechRuntimeConfig(env);

  if (config.mode === "fallback") {
    return {
      id: "tts",
      label: "本地 TTS",
      status: "fallback",
      provider: config.reason,
      mode: config.mode,
      detail: "当前会回退到浏览器内置朗读，尚未接入可用的本地高质量 TTS 服务。",
      requiredEnv: ["TTS_PROVIDER", "TTS_BASE_URL", "TTS_MODEL", "TTS_ENDPOINT_PATH"]
    };
  }

  if (config.source === "local") {
    return {
      id: "tts",
      label: "本地 TTS",
      status: "local",
      provider: config.providerLabel,
      mode: config.mode,
      detail: "已配置本地 OpenAI-compatible TTS endpoint，后续可替换为本地模型打包服务。",
      requiredEnv: ["TTS_PROVIDER", "TTS_BASE_URL", "TTS_MODEL", "TTS_ENDPOINT_PATH"]
    };
  }

  return {
    id: "tts",
    label: "云端 TTS",
    status: "cloud",
    provider: config.providerLabel,
    mode: config.mode,
    detail: "已配置云端高质量朗读，可正常使用，但还不是离线方案。",
    requiredEnv: ["TTS_PROVIDER", "TTS_BASE_URL", "TTS_MODEL", "TTS_API_KEY"]
  };
}

function createPronunciationItem(env: Environment): SpeechReadinessItem {
  const config = resolvePronunciationScoringConfig(env);

  if (config.mode === "fallback") {
    return {
      id: "pronunciation",
      label: "本地发音评分",
      status: "fallback",
      provider: config.reason,
      mode: config.mode,
      detail: "当前跟读会保留文本级完整度和发音重点诊断，尚未接入本地强制对齐或发音评分服务。",
      requiredEnv: [
        "PRONUNCIATION_PROVIDER",
        "PRONUNCIATION_BASE_URL",
        "PRONUNCIATION_ENDPOINT_PATH"
      ]
    };
  }

  return {
    id: "pronunciation",
    label: "本地发音评分",
    status: "local",
    provider: config.providerLabel,
    mode: config.mode,
    detail: "已配置本地 multipart 发音评分 endpoint，跟读录音后可返回发音、流利度、对齐和词级评分。",
    requiredEnv: [
      "PRONUNCIATION_PROVIDER",
      "PRONUNCIATION_BASE_URL",
      "PRONUNCIATION_ENDPOINT_PATH"
    ]
  };
}

export function summarizeLocalSpeechReadiness(env: Environment = process.env): LocalSpeechReadiness {
  const stt = createSpeechItem(env);
  const tts = createTtsItem(env);
  const pronunciation = createPronunciationItem(env);
  const nextSteps: string[] = [];

  if (stt.status !== "local") {
    nextSteps.push("配置本地 Whisper 或 whisper.cpp endpoint，并设置 SPEECH_PROVIDER=local-whisper 或 whisper-cpp。");
  }

  if (tts.status !== "local") {
    nextSteps.push("配置本地 OpenAI-compatible TTS endpoint，并设置 TTS_PROVIDER=local。");
  }

  if (pronunciation.status !== "local") {
    nextSteps.push("配置本地发音评分或强制对齐 endpoint，并设置 PRONUNCIATION_PROVIDER=local。");
  }

  if (stt.status === "local" && tts.status === "local" && pronunciation.status !== "local") {
    nextSteps.push("本机 STT/TTS endpoint 已具备，继续接入本地发音评分或强制对齐 endpoint 后即可完成口语练习链路。");
  }

  if (stt.status === "local" && tts.status === "local" && pronunciation.status === "local") {
    nextSteps.push("本机 STT/TTS/发音评分 endpoint 已具备，可运行 npm run speech:check -- --strict-practice 做发布前确认。");
  }

  return {
    offlineReady: stt.status === "local" && tts.status === "local",
    practiceReady: stt.status === "local" && tts.status === "local" && pronunciation.status === "local",
    stt,
    tts,
    pronunciation,
    nextSteps
  };
}
