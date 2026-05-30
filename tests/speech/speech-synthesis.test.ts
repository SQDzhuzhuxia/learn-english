import { describe, expect, it } from "vitest";
import { selectEnglishVoice } from "@/lib/speech/speech-synthesis";

function voice(name: string, lang: string, localService = true) {
  return {
    default: false,
    lang,
    localService,
    name,
    voiceURI: name
  } as SpeechSynthesisVoice;
}

describe("selectEnglishVoice", () => {
  it("prefers a known English voice for the requested locale", () => {
    const selected = selectEnglishVoice([
      voice("Chinese", "zh-CN"),
      voice("Samantha", "en-US"),
      voice("Daniel", "en-GB")
    ]);

    expect(selected?.name).toBe("Samantha");
  });

  it("falls back to another English voice when en-US is unavailable", () => {
    const selected = selectEnglishVoice([
      voice("Chinese", "zh-CN"),
      voice("Daniel", "en-GB")
    ]);

    expect(selected?.name).toBe("Daniel");
  });

  it("does not select a non-English voice", () => {
    const selected = selectEnglishVoice([voice("Chinese", "zh-CN")]);

    expect(selected).toBeUndefined();
  });
});
