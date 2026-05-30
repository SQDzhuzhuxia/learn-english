import { describe, expect, it, vi } from "vitest";
import {
  resolveTextToSpeechRuntimeConfig,
  synthesizeSpeech
} from "@/lib/speech/server/synthesize-speech";

describe("resolveTextToSpeechRuntimeConfig", () => {
  it("uses fallback mode by default", () => {
    expect(resolveTextToSpeechRuntimeConfig({}).mode).toBe("fallback");
  });

  it("resolves OpenAI TTS config with defaults", () => {
    const config = resolveTextToSpeechRuntimeConfig({
      TTS_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key"
    });

    expect(config.mode).toBe("openai-compatible");

    if (config.mode === "openai-compatible") {
      expect(config.baseUrl).toBe("https://api.openai.com/v1");
      expect(config.endpointPath).toBe("/audio/speech");
      expect(config.model).toBe("gpt-4o-mini-tts");
      expect(config.voice).toBe("alloy");
    }
  });

  it("resolves local OpenAI-compatible TTS without an API key", () => {
    const config = resolveTextToSpeechRuntimeConfig({
      TTS_PROVIDER: "local",
      TTS_BASE_URL: "http://127.0.0.1:8880/v1",
      TTS_MODEL: "local-tts"
    });

    expect(config.mode).toBe("openai-compatible");

    if (config.mode === "openai-compatible") {
      expect(config.source).toBe("local");
    }
  });
});

describe("synthesizeSpeech", () => {
  it("returns a fallback result when TTS is not configured", async () => {
    const result = await synthesizeSpeech({ text: "Hello" }, {});

    expect(result.source).toBe("fallback");
    expect(result.audio).toBeUndefined();
  });

  it("calls an OpenAI-compatible speech endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" }
      })
    );

    const result = await synthesizeSpeech(
      {
        text: "I would like to make an appointment.",
        instructions: "Speak slowly."
      },
      {
        TTS_PROVIDER: "openai-compatible",
        TTS_BASE_URL: "http://localhost:8080/v1",
        TTS_MODEL: "test-tts",
        TTS_API_KEY: "tts-key",
        TTS_VOICE: "nova"
      },
      fetchMock
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, string>;

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/v1/audio/speech",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tts-key",
          "Content-Type": "application/json"
        })
      })
    );
    expect(body.model).toBe("test-tts");
    expect(body.voice).toBe("nova");
    expect(body.response_format).toBe("mp3");
    expect(body.instructions).toBe("Speak slowly.");
    expect(result.source).toBe("cloud");
    expect(result.audio?.byteLength).toBe(3);
  });
});
