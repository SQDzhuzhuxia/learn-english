import { describe, expect, it } from "vitest";
import { explainMaterial, resolveAiRuntimeConfig } from "@/lib/ai/server/explain-segment";

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

  it("returns a fallback batch explanation when provider is not configured", async () => {
    const explanation = await explainMaterial(
      {
        materialTitle: "Doctor Visit",
        materialType: "美国生活",
        level: "A1",
        segments: [
          {
            id: "s1",
            order: 1,
            text: "I need to see a doctor."
          }
        ]
      },
      {}
    );

    expect(explanation.source).toBe("fallback");
    expect(explanation.segments).toHaveLength(1);
  });
});
