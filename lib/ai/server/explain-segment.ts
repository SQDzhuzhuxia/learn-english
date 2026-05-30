import {
  createFallbackMaterialExplanation,
  createFallbackSegmentExplanation,
  createFallbackRoleplayTurn,
  createFallbackWritingCorrection
} from "@/lib/ai/fallback-explanation";
import {
  correctWritingWithOpenAiCompatible,
  explainMaterialWithOpenAiCompatible,
  explainSegmentWithOpenAiCompatible,
  generateRoleplayTurnWithOpenAiCompatible
} from "@/lib/ai/openai-compatible";
import type {
  CorrectWritingInput,
  ExplainMaterialInput,
  ExplainSegmentInput,
  GenerateRoleplayTurnInput
} from "@/lib/ai/types";

type Environment = Record<string, string | undefined>;

type AiRuntimeConfig =
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

const PROVIDER_LABELS: Record<string, string> = {
  "openai-compatible": "OpenAI-compatible",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  qwen: "通义千问",
  doubao: "豆包/火山方舟",
  local: "本地 OpenAI-compatible 模型"
};

function readEnv(env: Environment, key: string) {
  const value = env[key]?.trim();
  return value || undefined;
}

export function resolveAiRuntimeConfig(env: Environment = process.env): AiRuntimeConfig {
  const provider = readEnv(env, "AI_PROVIDER") ?? "fallback";

  if (provider === "fallback" || provider === "mock") {
    return {
      mode: "fallback",
      reason: "本地降级解释"
    };
  }

  if (provider === "anthropic" || provider === "gemini") {
    return {
      mode: "fallback",
      reason: `${provider} 适配器尚未启用`
    };
  }

  const baseUrl =
    readEnv(env, "AI_BASE_URL") ?? (provider === "openai" ? "https://api.openai.com/v1" : undefined);
  const model = readEnv(env, "AI_MODEL");
  const providerSpecificKey = readEnv(env, `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`);
  const apiKey = readEnv(env, "AI_API_KEY") ?? providerSpecificKey ?? readEnv(env, "OPENAI_API_KEY");
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const timeoutMs = Number(readEnv(env, "AI_TIMEOUT_MS") ?? 20000);

  if (!baseUrl) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 AI_BASE_URL`
    };
  }

  if (!model) {
    return {
      mode: "fallback",
      reason: `${providerLabel} 缺少 AI_MODEL`
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
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 20000
  };
}

export async function explainSegment(input: ExplainSegmentInput, env: Environment = process.env) {
  const config = resolveAiRuntimeConfig(env);

  if (config.mode === "fallback") {
    return createFallbackSegmentExplanation(input, config.reason);
  }

  try {
    return await explainSegmentWithOpenAiCompatible(input, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider failed";
    return createFallbackSegmentExplanation(input, `${config.providerLabel} 暂不可用：${message}`);
  }
}

export async function explainMaterial(input: ExplainMaterialInput, env: Environment = process.env) {
  const config = resolveAiRuntimeConfig(env);

  if (config.mode === "fallback") {
    return createFallbackMaterialExplanation(input, config.reason);
  }

  try {
    const explanation = await explainMaterialWithOpenAiCompatible(input, config);

    if (explanation.segments.length === 0) {
      return createFallbackMaterialExplanation(input, `${config.providerLabel} 没有返回可用分句解释`);
    }

    return explanation;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider failed";
    return createFallbackMaterialExplanation(input, `${config.providerLabel} 暂不可用：${message}`);
  }
}

export async function correctWriting(input: CorrectWritingInput, env: Environment = process.env) {
  const config = resolveAiRuntimeConfig(env);

  if (config.mode === "fallback") {
    return createFallbackWritingCorrection(input, config.reason);
  }

  try {
    return await correctWritingWithOpenAiCompatible(input, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider failed";
    return createFallbackWritingCorrection(input, `${config.providerLabel} 暂不可用：${message}`);
  }
}

export async function generateRoleplayTurn(input: GenerateRoleplayTurnInput, env: Environment = process.env) {
  const config = resolveAiRuntimeConfig(env);

  if (config.mode === "fallback") {
    return createFallbackRoleplayTurn(input, config.reason);
  }

  try {
    return await generateRoleplayTurnWithOpenAiCompatible(input, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider failed";
    return createFallbackRoleplayTurn(input, `${config.providerLabel} 暂不可用：${message}`);
  }
}
