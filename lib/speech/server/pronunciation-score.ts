export type PronunciationScoringSource = "local" | "fallback";

export type PronunciationWordScore = {
  word: string;
  score: number;
  issue?: string;
};

export type PronunciationPhonemeFocus = {
  label: string;
  detail: string;
  words: string[];
};

export type PronunciationScoringResult = {
  source: PronunciationScoringSource;
  provider: string;
  model?: string;
  score?: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  alignmentScore?: number;
  wordScores: PronunciationWordScore[];
  phonemeFocus: PronunciationPhonemeFocus[];
  feedbackZh?: string;
  error?: string;
};

type Environment = Record<string, string | undefined>;

type PronunciationScoringConfig =
  | {
      mode: "fallback";
      reason: string;
    }
  | {
      mode: "local-multipart";
      baseUrl: string;
      endpointPath: string;
      fileField: string;
      referenceTextField: string;
      transcriptField: string;
      model?: string;
      providerLabel: string;
      timeoutMs: number;
    };

type RawPronunciationResponse = {
  score?: number;
  pronunciationScore?: number;
  pronunciation_score?: number;
  fluencyScore?: number;
  fluency_score?: number;
  alignmentScore?: number;
  alignment_score?: number;
  feedbackZh?: string;
  feedback_zh?: string;
  feedback?: string;
  words?: Array<{
    word?: string;
    text?: string;
    score?: number;
    issue?: string;
  }>;
  phonemeFocus?: Array<{
    label?: string;
    detail?: string;
    words?: string[];
  }>;
  phoneme_focus?: Array<{
    label?: string;
    detail?: string;
    words?: string[];
  }>;
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : undefined;
}

function normalizeWordScores(words: RawPronunciationResponse["words"]): PronunciationWordScore[] {
  if (!Array.isArray(words)) {
    return [];
  }

  return words
    .map((item) => {
      const word = (item.word ?? item.text ?? "").trim();
      const score = readNumber(item.score);

      if (!word || score === undefined) {
        return null;
      }

      const normalized: PronunciationWordScore = {
        word,
        score
      };

      const issue = item.issue?.trim();

      if (issue) {
        normalized.issue = issue;
      }

      return normalized;
    })
    .filter((item): item is PronunciationWordScore => item !== null)
    .slice(0, 12);
}

function normalizePhonemeFocus(data: RawPronunciationResponse): PronunciationPhonemeFocus[] {
  const items = data.phonemeFocus ?? data.phoneme_focus ?? [];

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const label = item.label?.trim();
      const detail = item.detail?.trim();
      const words = Array.isArray(item.words) ? item.words.map((word) => word.trim()).filter(Boolean) : [];

      if (!label || !detail) {
        return null;
      }

      return {
        label,
        detail,
        words: words.slice(0, 4)
      };
    })
    .filter((item): item is PronunciationPhonemeFocus => Boolean(item))
    .slice(0, 6);
}

export function resolvePronunciationScoringConfig(env: Environment = process.env): PronunciationScoringConfig {
  const provider = readEnv(env, "PRONUNCIATION_PROVIDER") ?? "fallback";

  if (provider === "fallback") {
    return {
      mode: "fallback",
      reason: "音频级发音评分未配置"
    };
  }

  if (provider !== "local") {
    return {
      mode: "fallback",
      reason: `暂不支持的发音评分 provider：${provider}`
    };
  }

  const baseUrl = readEnv(env, "PRONUNCIATION_BASE_URL");

  if (!baseUrl) {
    return {
      mode: "fallback",
      reason: "本地发音评分缺少 PRONUNCIATION_BASE_URL"
    };
  }

  const timeoutMs = Number(readEnv(env, "PRONUNCIATION_TIMEOUT_MS") ?? 30000);

  return {
    mode: "local-multipart",
    baseUrl,
    endpointPath: readEnv(env, "PRONUNCIATION_ENDPOINT_PATH") ?? "/score-pronunciation",
    fileField: readEnv(env, "PRONUNCIATION_FILE_FIELD") ?? "file",
    referenceTextField: readEnv(env, "PRONUNCIATION_REFERENCE_TEXT_FIELD") ?? "reference_text",
    transcriptField: readEnv(env, "PRONUNCIATION_TRANSCRIPT_FIELD") ?? "transcript",
    model: readEnv(env, "PRONUNCIATION_MODEL"),
    providerLabel: "本地发音评分",
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000
  };
}

export async function scorePronunciation(
  input: {
    file: File;
    referenceText: string;
    transcript?: string;
  },
  env: Environment = process.env,
  fetcher: typeof fetch = fetch
): Promise<PronunciationScoringResult> {
  const config = resolvePronunciationScoringConfig(env);
  const referenceText = input.referenceText.trim();

  if (!referenceText) {
    return {
      source: "fallback",
      provider: "输入为空",
      wordScores: [],
      phonemeFocus: [],
      error: "缺少跟读目标文本"
    };
  }

  if (config.mode === "fallback") {
    return {
      source: "fallback",
      provider: config.reason,
      wordScores: [],
      phonemeFocus: [],
      error: config.reason
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const body = new FormData();
  body.set(config.fileField, input.file);
  body.set(config.referenceTextField, referenceText);

  if (input.transcript?.trim()) {
    body.set(config.transcriptField, input.transcript.trim());
  }

  if (config.model) {
    body.set("model", config.model);
  }

  try {
    const response = await fetcher(joinUrl(config.baseUrl, config.endpointPath), {
      method: "POST",
      signal: controller.signal,
      body
    });

    if (!response.ok) {
      throw new Error(`Pronunciation scoring provider returned ${response.status}`);
    }

    const data = (await response.json()) as RawPronunciationResponse;
    const pronunciationScore = readNumber(data.pronunciationScore ?? data.pronunciation_score);
    const fluencyScore = readNumber(data.fluencyScore ?? data.fluency_score);
    const alignmentScore = readNumber(data.alignmentScore ?? data.alignment_score);
    const score =
      readNumber(data.score) ??
      (pronunciationScore !== undefined || fluencyScore !== undefined || alignmentScore !== undefined
        ? Math.round(
            [pronunciationScore, fluencyScore, alignmentScore]
              .filter((value): value is number => value !== undefined)
              .reduce((sum, value, _, values) => sum + value / values.length, 0)
          )
        : undefined);

    return {
      source: "local",
      provider: config.providerLabel,
      model: config.model,
      score,
      pronunciationScore,
      fluencyScore,
      alignmentScore,
      wordScores: normalizeWordScores(data.words),
      phonemeFocus: normalizePhonemeFocus(data),
      feedbackZh: data.feedbackZh?.trim() || data.feedback_zh?.trim() || data.feedback?.trim() || undefined
    };
  } catch (error) {
    return {
      source: "fallback",
      provider: config.providerLabel,
      model: config.model,
      wordScores: [],
      phonemeFocus: [],
      error: error instanceof Error ? error.message : "Pronunciation scoring provider failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
