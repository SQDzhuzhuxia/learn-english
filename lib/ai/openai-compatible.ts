import type {
  AiSegmentExplanation,
  AiSegmentExpression,
  ExplainSegmentInput
} from "@/lib/ai/types";

export type OpenAiCompatibleConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  providerLabel: string;
  timeoutMs: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildPrompt(input: ExplainSegmentInput) {
  return [
    "请为中文母语、英语初级学习者解释下面这句英语。",
    "目标是美国生活和工作英语，不要写考试化长篇语法讲义。",
    "必须输出 JSON，不要输出 markdown。",
    "JSON 字段：sentence, meaningZh, structure, keyExpressions, commonMistake, shadowingTip。",
    "structure 是 3 到 5 个中文字符串。",
    "keyExpressions 是 2 到 4 个对象，每个对象包含 text, meaningZh, example。",
    "",
    `材料标题：${input.materialTitle}`,
    `材料类型：${input.materialType}`,
    `学习者水平：${input.level}`,
    `当前句：${input.sentence}`,
    input.contextText ? `上下文：${input.contextText.slice(0, 2400)}` : ""
  ].join("\n");
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return strings.length > 0 ? strings.slice(0, 5) : fallback;
}

function readExpressions(value: unknown, fallbackSentence: string): AiSegmentExpression[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const text = readString(record.text, "");

      if (!text) {
        return undefined;
      }

      return {
        text,
        meaningZh: readString(record.meaningZh, "结合上下文理解并保存复习。"),
        example: readString(record.example, fallbackSentence)
      };
    })
    .filter((item): item is AiSegmentExpression => Boolean(item))
    .slice(0, 4);
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

export function parseSegmentExplanationResponse(
  content: string,
  input: ExplainSegmentInput,
  providerLabel: string
): AiSegmentExplanation {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const sentence = readString(parsed.sentence, input.sentence);
  const keyExpressions = readExpressions(parsed.keyExpressions, sentence);

  return {
    sentence,
    meaningZh: readString(parsed.meaningZh, "这句话需要结合上下文理解。"),
    structure: readStringArray(parsed.structure, ["先理解整句大意，再观察可复用表达。"]),
    keyExpressions:
      keyExpressions.length > 0
        ? keyExpressions
        : [
            {
              text: sentence.split(/\s+/).slice(0, 4).join(" "),
              meaningZh: "建议作为整句表达保存复习。",
              example: sentence
            }
          ],
    commonMistake: readString(
      parsed.commonMistake,
      "不要按中文语序逐词翻译，优先模仿自然英语表达。"
    ),
    shadowingTip: readString(parsed.shadowingTip, "先慢速完整跟读，再逐步提高流利度。"),
    source: "model",
    provider: providerLabel,
    generatedAt: new Date().toISOString()
  };
}

export async function explainSegmentWithOpenAiCompatible(
  input: ExplainSegmentInput,
  config: OpenAiCompatibleConfig
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${trimBaseUrl(config.baseUrl)}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a careful English coach for Chinese-native adult beginners."
          },
          {
            role: "user",
            content: buildPrompt(input)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty message");
    }

    return parseSegmentExplanationResponse(content, input, config.providerLabel);
  } finally {
    clearTimeout(timeout);
  }
}
