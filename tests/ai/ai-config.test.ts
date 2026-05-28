import { describe, expect, it } from "vitest";
import { resolveAiRuntimeConfig } from "@/lib/ai/server/explain-segment";

describe("resolveAiRuntimeConfig", () => {
  it("uses fallback mode by default", () => {
    expect(resolveAiRuntimeConfig({}).mode).toBe("fallback");
  });

  it("resolves OpenAI-compatible config when required values exist", () => {
    const config = resolveAiRuntimeConfig({
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "http://localhost:11434/v1",
      AI_MODEL: "local-model",
      AI_API_KEY: "local-key"
    });

    expect(config.mode).toBe("openai-compatible");

    if (config.mode === "openai-compatible") {
      expect(config.baseUrl).toBe("http://localhost:11434/v1");
      expect(config.model).toBe("local-model");
    }
  });

  it("falls back when a cloud provider is missing its model", () => {
    const config = resolveAiRuntimeConfig({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key"
    });

    expect(config.mode).toBe("fallback");
  });
});
