import type {
  AiMaterialExplanation,
  AiMaterialSegmentExplanation,
  AiSegmentExplanation,
  AiSegmentExpression,
  AiWritingCorrection,
  CorrectWritingInput,
  ExplainMaterialInput,
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

function buildMaterialPrompt(input: ExplainMaterialInput) {
  const segments = input.segments
    .slice(0, 60)
    .map((segment) => `${segment.order}. [${segment.id}] ${segment.text}`)
    .join("\n");

  return [
    "请为中文母语、英语初级学习者批量解释一篇英语材料。",
    "目标是美国生活和工作英语，要服务大量可理解输入，不要写考试化长篇语法讲义。",
    "必须输出 JSON，不要输出 markdown。",
    "JSON 字段：materialTitle, summaryZh, levelNote, segments, keyExpressions。",
    "segments 是数组，每项包含 segmentId, order, meaningZh, structure, keyExpressions, commonMistake, shadowingTip。",
    "每个 segment 的 structure 是 2 到 4 个中文字符串。",
    "每个 segment 的 keyExpressions 是 1 到 3 个对象，每个对象包含 text, meaningZh, example。",
    "keyExpressions 是整篇材料最值得保存的 5 到 12 个表达，每项包含 text, meaningZh, example。",
    "",
    `材料标题：${input.materialTitle}`,
    `材料类型：${input.materialType}`,
    `学习者水平：${input.level}`,
    input.contextText ? `全文上下文：${input.contextText.slice(0, 5000)}` : "",
    "分句：",
    segments
  ].join("\n");
}

function buildWritingCorrectionPrompt(input: CorrectWritingInput) {
  return [
    "请为中文母语、英语初级学习者批改一段英文写作。",
    "目标是美国生活和工作英语，反馈要实用、简洁、中文为主。",
    "不要写长篇语法课。指出最重要的问题，给出更自然说法。",
    "必须输出 JSON，不要输出 markdown。",
    "JSON 字段：originalText, correctedText, feedbackZh, keyProblems, betterExpressions。",
    "keyProblems 是 2 到 5 个中文字符串。",
    "betterExpressions 是 1 到 4 个对象，每个对象包含 text, meaningZh, example。",
    "",
    `任务标题：${input.promptTitle}`,
    `任务要求：${input.prompt}`,
    `学习者水平：${input.level}`,
    `用户文本：${input.userText}`
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

function parseMaterialSegment(
  raw: unknown,
  input: ExplainMaterialInput,
  providerLabel: string
): AiMaterialSegmentExplanation | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const segmentId = readString(record.segmentId, "");
  const order =
    typeof record.order === "number"
      ? record.order
      : Number.parseInt(readString(record.order, ""), 10);
  const sourceSegment =
    input.segments.find((segment) => segment.id === segmentId) ??
    input.segments.find((segment) => segment.order === order);

  if (!sourceSegment) {
    return undefined;
  }

  const sentence = sourceSegment.text;

  return {
    segmentId: sourceSegment.id,
    order: sourceSegment.order,
    explanation: {
      sentence,
      meaningZh: readString(record.meaningZh, "这句话需要结合上下文理解。"),
      structure: readStringArray(record.structure, ["先理解整句大意，再观察可复用表达。"]),
      keyExpressions:
        readExpressions(record.keyExpressions, sentence).length > 0
          ? readExpressions(record.keyExpressions, sentence)
          : [
              {
                text: sentence.split(/\s+/).slice(0, 4).join(" "),
                meaningZh: "建议作为整句表达保存复习。",
                example: sentence
              }
            ],
      commonMistake: readString(
        record.commonMistake,
        "不要按中文语序逐词翻译，优先模仿自然英语表达。"
      ),
      shadowingTip: readString(record.shadowingTip, "先慢速完整跟读，再逐步提高流利度。"),
      source: "model",
      provider: providerLabel,
      generatedAt: new Date().toISOString()
    }
  };
}

export function parseMaterialExplanationResponse(
  content: string,
  input: ExplainMaterialInput,
  providerLabel: string
): AiMaterialExplanation {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const parsedSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
  const segments = parsedSegments
    .map((segment) => parseMaterialSegment(segment, input, providerLabel))
    .filter((segment): segment is AiMaterialSegmentExplanation => Boolean(segment));
  const generatedAt = new Date().toISOString();

  return {
    materialTitle: readString(parsed.materialTitle, input.materialTitle),
    summaryZh: readString(parsed.summaryZh, "这篇材料适合逐句听读，并保存真实可用表达。"),
    levelNote: readString(parsed.levelNote, "先理解大意，再逐句精学。"),
    segments,
    keyExpressions: readExpressions(parsed.keyExpressions, input.segments[0]?.text ?? "").slice(0, 12),
    source: "model",
    provider: providerLabel,
    generatedAt
  };
}

export function parseWritingCorrectionResponse(
  content: string,
  input: CorrectWritingInput,
  providerLabel: string
): AiWritingCorrection {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const correctedText = readString(parsed.correctedText, input.userText);

  return {
    originalText: readString(parsed.originalText, input.userText),
    correctedText,
    feedbackZh: readString(parsed.feedbackZh, "建议先保证句子完整，再追求自然表达。"),
    keyProblems: readStringArray(parsed.keyProblems, ["检查主语、动词和英文语序。"]),
    betterExpressions:
      readExpressions(parsed.betterExpressions, correctedText).length > 0
        ? readExpressions(parsed.betterExpressions, correctedText)
        : [
            {
              text: correctedText,
              meaningZh: "更自然的表达。",
              example: correctedText
            }
          ],
    source: "model",
    provider: providerLabel,
    generatedAt: new Date().toISOString()
  };
}

async function requestChatCompletion(prompt: string, config: OpenAiCompatibleConfig) {
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
            content: prompt
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

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function explainSegmentWithOpenAiCompatible(
  input: ExplainSegmentInput,
  config: OpenAiCompatibleConfig
) {
  const content = await requestChatCompletion(buildPrompt(input), config);
  return parseSegmentExplanationResponse(content, input, config.providerLabel);
}

export async function explainMaterialWithOpenAiCompatible(
  input: ExplainMaterialInput,
  config: OpenAiCompatibleConfig
) {
  const content = await requestChatCompletion(buildMaterialPrompt(input), config);
  return parseMaterialExplanationResponse(content, input, config.providerLabel);
}

export async function correctWritingWithOpenAiCompatible(
  input: CorrectWritingInput,
  config: OpenAiCompatibleConfig
) {
  const content = await requestChatCompletion(buildWritingCorrectionPrompt(input), config);
  return parseWritingCorrectionResponse(content, input, config.providerLabel);
}
