export type TranscriptionSource = "cloud" | "local" | "fallback";

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
      source: "cloud" | "local";
      baseUrl: string;
      apiKey?: string;
      model: string;
      providerLabel: string;
      timeoutMs: number;
    }
  | {
      mode: "local-multipart";
      baseUrl: string;
      endpointPath: string;
      fileField: string;
      responseTextPath: string;
      model?: string;
      providerLabel: string;
      timeoutMs: number;
    };

type TranscriptionResponse = {
  text?: string;
  transcription?: string;
  result?: {
    text?: string;
  };
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  "openai-compatible": "OpenAI-compatible",
  local: "本地 OpenAI-compatible STT",
  "local-whisper": "本地 Whisper",
  "whisper-cpp": "本地 whisper.cpp"
};

const LOCAL_MULTIPART_PROVIDERS = new Set(["local-whisper", "whisper-cpp"]);

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

function readStringPath(data: unknown, path: string) {
  let current: unknown = data;

  for (const segment of path.split(".")) {
    if (!segment) {
      continue;
    }

    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current.trim() : undefined;
}

function extractTranscriptText(data: TranscriptionResponse, responseTextPath = "text") {
  return (
    readStringPath(data, responseTextPath) ||
    data.text?.trim() ||
    data.transcription?.trim() ||
    data.result?.text?.trim()
  );
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
  const timeoutMs = Number(readEnv(env, "SPEECH_TIMEOUT_MS") ?? 30000);

  if (LOCAL_MULTIPART_PROVIDERS.has(provider)) {
    const baseUrl = readEnv(env, "SPEECH_BASE_URL");

    if (!baseUrl) {
      return {
        mode: "fallback",
        reason: `${providerLabel} 缺少 SPEECH_BASE_URL`
      };
    }

    return {
      mode: "local-multipart",
      baseUrl,
      endpointPath: readEnv(env, "SPEECH_ENDPOINT_PATH") ?? "/inference",
      fileField: readEnv(env, "SPEECH_FILE_FIELD") ?? "file",
      responseTextPath: readEnv(env, "SPEECH_RESPONSE_TEXT_PATH") ?? "text",
      model: readEnv(env, "SPEECH_MODEL"),
      providerLabel,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000
    };
  }

  const baseUrl =
    readEnv(env, "SPEECH_BASE_URL") ?? (provider === "openai" ? "https://api.openai.com/v1" : undefined);
  const model = readEnv(env, "SPEECH_MODEL") ?? (provider === "openai" ? "gpt-4o-mini-transcribe" : undefined);
  const providerSpecificKey = readEnv(env, `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`);
  const apiKey =
    readEnv(env, "SPEECH_API_KEY") ?? providerSpecificKey ?? readEnv(env, "AI_API_KEY") ?? readEnv(env, "OPENAI_API_KEY");

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
    source: provider === "local" ? "local" : "cloud",
    baseUrl,
    apiKey,
    model,
    providerLabel,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000
  };
}

async function transcribeWithLocalMultipart(
  input: {
    file: File;
    language?: string;
    prompt?: string;
  },
  config: Extract<SpeechRuntimeConfig, { mode: "local-multipart" }>,
  fetcher: typeof fetch,
  signal: AbortSignal
) {
  const body = new FormData();
  body.set(config.fileField, input.file);
  body.set("response_format", "json");

  if (config.model) {
    body.set("model", config.model);
  }

  if (input.language) {
    body.set("language", input.language);
  }

  if (input.prompt) {
    body.set("prompt", input.prompt);
  }

  const response = await fetcher(joinUrl(config.baseUrl, config.endpointPath), {
    method: "POST",
    signal,
    body
  });

  if (!response.ok) {
    throw new Error(`Local STT provider returned ${response.status}`);
  }

  const data = (await response.json()) as TranscriptionResponse;
  const text = extractTranscriptText(data, config.responseTextPath);

  if (!text) {
    throw new Error("Local STT provider returned an empty transcript");
  }

  return {
    text,
    source: "local" as const,
    provider: config.providerLabel,
    model: config.model
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
    if (config.mode === "local-multipart") {
      return await transcribeWithLocalMultipart(input, config, fetcher, controller.signal);
    }

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

    const response = await fetcher(joinUrl(config.baseUrl, "/audio/transcriptions"), {
      method: "POST",
      headers,
      signal: controller.signal,
      body
    });

    if (!response.ok) {
      throw new Error(`STT provider returned ${response.status}`);
    }

    const data = (await response.json()) as TranscriptionResponse;
    const text = extractTranscriptText(data);

    if (!text) {
      throw new Error("STT provider returned an empty transcript");
    }

    return {
      text,
      source: config.source,
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
