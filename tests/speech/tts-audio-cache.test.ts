import { describe, expect, it } from "vitest";
import { canCacheTtsAudio, createTtsAudioCacheId } from "@/lib/speech/tts-audio-cache";

describe("TTS audio cache", () => {
  it("creates stable ids for equivalent text spacing", () => {
    const first = createTtsAudioCacheId({
      text: "Could you please   repeat that?",
      voice: "alloy",
      format: "mp3"
    });
    const second = createTtsAudioCacheId({
      text: "Could you please repeat that?",
      voice: "alloy",
      format: "mp3"
    });

    expect(first).toBe(second);
  });

  it("keeps different voices in separate cache entries", () => {
    const first = createTtsAudioCacheId({
      text: "I would like to make an appointment.",
      voice: "alloy"
    });
    const second = createTtsAudioCacheId({
      text: "I would like to make an appointment.",
      voice: "nova"
    });

    expect(first).not.toBe(second);
  });

  it("only caches non-empty short learning audio", () => {
    expect(canCacheTtsAudio({ text: "  " })).toBe(false);
    expect(canCacheTtsAudio({ text: "Please speak slowly." })).toBe(true);
    expect(canCacheTtsAudio({ text: "a".repeat(1201) })).toBe(false);
  });
});
