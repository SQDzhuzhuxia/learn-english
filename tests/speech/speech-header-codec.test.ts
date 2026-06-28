import { describe, expect, it } from "vitest";
import { decodeSpeechHeaderValue, encodeSpeechHeaderValue } from "@/lib/speech/speech-header-codec";

describe("speech header codec", () => {
  it("round-trips non-ASCII provider metadata through HTTP-safe headers", () => {
    const encoded = encodeSpeechHeaderValue("本地 OpenAI-compatible TTS");

    expect(encoded).not.toContain("本地");
    expect(decodeSpeechHeaderValue(encoded)).toBe("本地 OpenAI-compatible TTS");
  });
});
