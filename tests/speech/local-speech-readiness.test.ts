import { describe, expect, it } from "vitest";
import { summarizeLocalSpeechReadiness } from "@/lib/speech/server/local-speech-readiness";

describe("summarizeLocalSpeechReadiness", () => {
  it("reports fallback status when speech services are not configured", () => {
    const readiness = summarizeLocalSpeechReadiness({
      SPEECH_PROVIDER: "fallback",
      TTS_PROVIDER: "fallback"
    });

    expect(readiness.offlineReady).toBe(false);
    expect(readiness.practiceReady).toBe(false);
    expect(readiness.stt.status).toBe("fallback");
    expect(readiness.tts.status).toBe("fallback");
    expect(readiness.pronunciation.status).toBe("fallback");
    expect(readiness.nextSteps).toContain(
      "配置本地 Whisper 或 whisper.cpp endpoint，并设置 SPEECH_PROVIDER=local-whisper 或 whisper-cpp。"
    );
  });

  it("reports local offline readiness when local STT and TTS endpoints are configured", () => {
    const readiness = summarizeLocalSpeechReadiness({
      SPEECH_PROVIDER: "local-whisper",
      SPEECH_BASE_URL: "http://127.0.0.1:8080",
      TTS_PROVIDER: "local",
      TTS_BASE_URL: "http://127.0.0.1:8880/v1",
      TTS_MODEL: "local-tts"
    });

    expect(readiness.offlineReady).toBe(true);
    expect(readiness.practiceReady).toBe(false);
    expect(readiness.stt.status).toBe("local");
    expect(readiness.tts.status).toBe("local");
    expect(readiness.pronunciation.status).toBe("fallback");
    expect(readiness.nextSteps).toContain("配置本地发音评分或强制对齐 endpoint，并设置 PRONUNCIATION_PROVIDER=local。");
    expect(readiness.nextSteps.some((step) => step.includes("口语练习链路"))).toBe(true);
  });

  it("distinguishes cloud speech from local offline readiness", () => {
    const readiness = summarizeLocalSpeechReadiness({
      SPEECH_PROVIDER: "openai",
      TTS_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key"
    });

    expect(readiness.offlineReady).toBe(false);
    expect(readiness.practiceReady).toBe(false);
    expect(readiness.stt.status).toBe("cloud");
    expect(readiness.tts.status).toBe("cloud");
  });

  it("reports full local practice readiness when pronunciation scoring is configured", () => {
    const readiness = summarizeLocalSpeechReadiness({
      SPEECH_PROVIDER: "local-whisper",
      SPEECH_BASE_URL: "http://127.0.0.1:8080",
      TTS_PROVIDER: "local",
      TTS_BASE_URL: "http://127.0.0.1:8880/v1",
      TTS_MODEL: "local-tts",
      PRONUNCIATION_PROVIDER: "local",
      PRONUNCIATION_BASE_URL: "http://127.0.0.1:8090",
      PRONUNCIATION_ENDPOINT_PATH: "/api/score"
    });

    expect(readiness.offlineReady).toBe(true);
    expect(readiness.practiceReady).toBe(true);
    expect(readiness.pronunciation.status).toBe("local");
    expect(readiness.nextSteps.some((step) => step.includes("strict-practice"))).toBe(true);
  });
});
