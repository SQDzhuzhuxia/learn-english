export type TranscriptionSource = "cloud" | "fallback";

export type TranscriptionResult = {
  text: string;
  source: TranscriptionSource;
  provider: string;
  model?: string;
  error?: string;
};

type Environment = Record<string, string | undefined>;

type SpeechRuntimeConfig =
  | {
      mode: "fallback";
      reason: string;
    }
  | {
      mode: "openai-compatible";
      baseUrl: string;
      apiKey?: string;
      model: string;
      providerLabel: string;
      timeoutMs: number;
    };

type TranscriptionResponse = {
  text?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  "openai-compatible": "OpenAI-compatible",
  local: "本地 OpenAI-compatible STT"
};

function readEnv(env: Environment, key: string) {
  const value = env[key]?.trim();
  return value || undefined;
}

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function resolveSpeechRuntimeConfig(env: Environment = process.env): SpeechRuntimeConfig {
  const provider = readEnv(env, "SPEECH_PROVIDER") ?? "fallback";

  if (provider === "fallback" || provider === "browser") {
    return {
      mode: "fallback",
      reason: "云端语音识别未配置"
    };
  }

  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const baseUrl =
    readEnv(env, "SPEECH_BASE_URL") ?? (provider === "openai" ? "https://api.openai.com/v1" : undefined);
  const model = readEnv(env, "SPEECH_MODEL") ?? (provider === "openai" ? "gpt-4o-mini-transcribe" : undefined);
  const providerSpecificKey = readEnv(env, `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`);
  const apiKey =
    readEnv(env, "SPEECH_API_KEY") ?? providerSpecificKey ?? readEnv(env, "AI_API_KEY") ?? readEnv(env, "OPENAI_API_KEY");
  const timeoutMs = Number(readEnv(env, "SPEECH_TIMEOUT_MS") ?? 30000);

  if (!baseUrl) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 SPEECH_BASE_URL`
    };
  }

  if (!model) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 SPEECH_MODEL`
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
    baseUrl,
    apiKey,
    model,
    providerLabel,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000
  };
}

export async function transcribeAudioFile(
  input: {
    file: File;
    language?: string;
    prompt?: string;
  },
  env: Environment = process.env,
  fetcher: typeof fetch = fetch
): Promise<TranscriptionResult> {
  const config = resolveSpeechRuntimeConfig(env);

  if (config.mode === "fallback") {
    return {
      text: "",
      source: "fallback",
      provider: config.reason,
      error: config.reason
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body = new FormData();
    body.set("file", input.file);
    body.set("model", config.model);
    body.set("response_format", "json");

    if (input.language) {
      body.set("language", input.language);
    }

    if (input.prompt) {
      body.set("prompt", input.prompt);
    }

    const headers: Record<string, string> = {};

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetcher(`${trimBaseUrl(config.baseUrl)}/audio/transcriptions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body
    });

    if (!response.ok) {
      throw new Error(`STT provider returned ${response.status}`);
    }

    const data = (await response.json()) as TranscriptionResponse;
    const text = data.text?.trim();

    if (!text) {
      throw new Error("STT provider returned an empty transcript");
    }

    return {
      text,
      source: "cloud",
      provider: config.providerLabel,
      model: config.model
    };
  } catch (error) {
    return {
      text: "",
      source: "fallback",
      provider: config.providerLabel,
      model: config.model,
      error: error instanceof Error ? error.message : "STT provider failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
