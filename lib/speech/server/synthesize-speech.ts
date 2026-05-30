export type SpeechSynthesisSource = "cloud" | "local" | "fallback";

export type SpeechSynthesisAudioResult = {
  audio?: ArrayBuffer;
  contentType?: string;
  source: SpeechSynthesisSource;
  provider: string;
  model?: string;
  voice?: string;
  error?: string;
};

type Environment = Record<string, string | undefined>;

type TtsRuntimeConfig =
  | {
      mode: "fallback";
      reason: string;
    }
  | {
      mode: "openai-compatible";
      source: "cloud" | "local";
      baseUrl: string;
      endpointPath: string;
      apiKey?: string;
      model: string;
      voice: string;
      format: string;
      instructions?: string;
      providerLabel: string;
      timeoutMs: number;
    };

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  "openai-compatible": "OpenAI-compatible TTS",
  local: "本地 OpenAI-compatible TTS"
};

const CONTENT_TYPES: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  mp3: "audio/mpeg",
  opus: "audio/opus",
  wav: "audio/wav"
};

function readEnv(env: Environment, key: string) {
  const value = env[key]?.trim();
  return value || undefined;
}

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string) {
  return `${trimBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`;
}

function getContentType(format: string) {
  return CONTENT_TYPES[format.toLowerCase()] ?? "audio/mpeg";
}

export function resolveTextToSpeechRuntimeConfig(env: Environment = process.env): TtsRuntimeConfig {
  const provider = readEnv(env, "TTS_PROVIDER") ?? "fallback";

  if (provider === "fallback" || provider === "browser") {
    return {
      mode: "fallback",
      reason: "高质量 TTS 未配置"
    };
  }

  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const baseUrl = readEnv(env, "TTS_BASE_URL") ?? (provider === "openai" ? "https://api.openai.com/v1" : undefined);
  const model = readEnv(env, "TTS_MODEL") ?? (provider === "openai" ? "gpt-4o-mini-tts" : undefined);
  const providerSpecificKey = readEnv(env, `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`);
  const apiKey = readEnv(env, "TTS_API_KEY") ?? providerSpecificKey ?? readEnv(env, "AI_API_KEY") ?? readEnv(env, "OPENAI_API_KEY");
  const timeoutMs = Number(readEnv(env, "TTS_TIMEOUT_MS") ?? 30000);

  if (!baseUrl) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 TTS_BASE_URL`
    };
  }

  if (!model) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 TTS_MODEL`
    };
  }

  if (!apiKey && provider !== "local") {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 API Key`
    };
  }

  return {
    mode: "openai-compatible",
    source: provider === "local" ? "local" : "cloud",
    baseUrl,
    endpointPath: readEnv(env, "TTS_ENDPOINT_PATH") ?? "/audio/speech",
    apiKey,
    model,
    voice: readEnv(env, "TTS_VOICE") ?? "alloy",
    format: readEnv(env, "TTS_FORMAT") ?? "mp3",
    instructions: readEnv(env, "TTS_INSTRUCTIONS"),
    providerLabel,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000
  };
}

export async function synthesizeSpeech(
  input: {
    text: string;
    voice?: string;
    format?: string;
    instructions?: string;
  },
  env: Environment = process.env,
  fetcher: typeof fetch = fetch
): Promise<SpeechSynthesisAudioResult> {
  const config = resolveTextToSpeechRuntimeConfig(env);
  const cleanText = input.text.trim();

  if (!cleanText) {
    return {
      source: "fallback",
      provider: "输入为空",
      error: "没有可朗读的英文内容"
    };
  }

  if (config.mode === "fallback") {
    return {
      source: "fallback",
      provider: config.reason,
      error: config.reason
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const format = input.format?.trim() || config.format;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetcher(joinUrl(config.baseUrl, config.endpointPath), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        input: cleanText,
        voice: input.voice?.trim() || config.voice,
        response_format: format,
        ...(input.instructions?.trim() || config.instructions
          ? { instructions: input.instructions?.trim() || config.instructions }
          : {})
      })
    });

    if (!response.ok) {
      throw new Error(`TTS provider returned ${response.status}`);
    }

    const audio = await response.arrayBuffer();

    if (audio.byteLength === 0) {
      throw new Error("TTS provider returned empty audio");
    }

    return {
      audio,
      contentType: response.headers.get("Content-Type") ?? getContentType(format),
      source: config.source,
      provider: config.providerLabel,
      model: config.model,
      voice: input.voice?.trim() || config.voice
    };
  } catch (error) {
    return {
      source: "fallback",
      provider: config.providerLabel,
      model: config.model,
      voice: input.voice?.trim() || config.voice,
      error: error instanceof Error ? error.message : "TTS provider failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
