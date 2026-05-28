import { describe, expect, it, vi } from "vitest";
import {
  resolveSpeechRuntimeConfig,
  transcribeAudioFile
} from "@/lib/speech/server/transcribe-audio";

describe("resolveSpeechRuntimeConfig", () => {
  it("uses fallback mode by default", () => {
    expect(resolveSpeechRuntimeConfig({}).mode).toBe("fallback");
  });

  it("resolves OpenAI speech config with defaults", () => {
    const config = resolveSpeechRuntimeConfig({
      SPEECH_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key"
    });

    expect(config.mode).toBe("openai-compatible");

    if (config.mode === "openai-compatible") {
      expect(config.baseUrl).toBe("https://api.openai.com/v1");
      expect(config.model).toBe("gpt-4o-mini-transcribe");
    }
  });
});

describe("transcribeAudioFile", () => {
  it("returns a fallback result when speech is not configured", async () => {
    const result = await transcribeAudioFile(
      {
        file: new File(["audio"], "test.webm", { type: "audio/webm" })
      },
      {}
    );

    expect(result.source).toBe("fallback");
    expect(result.text).toBe("");
  });

  it("calls an OpenAI-compatible transcription endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "I would like to make an appointment." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const result = await transcribeAudioFile(
      {
        file: new File(["audio"], "test.webm", { type: "audio/webm" }),
        language: "en",
        prompt: "I would like to make an appointment."
      },
      {
        SPEECH_PROVIDER: "openai-compatible",
        SPEECH_BASE_URL: "http://localhost:8080/v1",
        SPEECH_MODEL: "test-transcribe",
        SPEECH_API_KEY: "speech-key"
      },
      fetchMock
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer speech-key"
        })
      })
    );
    expect(result.source).toBe("cloud");
    expect(result.text).toContain("appointment");
  });
});
