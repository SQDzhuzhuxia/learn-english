import { readCachedTtsAudio, writeCachedTtsAudio } from "@/lib/speech/tts-audio-cache";
import { decodeSpeechHeaderValue } from "@/lib/speech/speech-header-codec";

type SpeakEnglishOptions = {
  format?: string;
  instructions?: string;
  lang?: string;
  pitch?: number;
  preferServer?: boolean;
  rate?: number;
  voice?: string;
  volume?: number;
};

type SpeakEnglishResult = {
  ok: boolean;
  message: string;
  voiceName?: string;
};

const preferredVoiceNames = [
  "samantha",
  "alex",
  "google us english",
  "google uk english female",
  "microsoft jenny",
  "microsoft aria",
  "microsoft guy",
  "daniel",
  "karen"
];

let activeAudio: HTMLAudioElement | undefined;
let activeAudioUrl: string | undefined;

function getSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return undefined;
  }

  return window.speechSynthesis;
}

function normalizeLang(lang: string) {
  return lang.toLowerCase().replace("_", "-");
}

export function selectEnglishVoice(voices: SpeechSynthesisVoice[], preferredLang = "en-US") {
  const normalizedPreferredLang = normalizeLang(preferredLang);
  const englishVoices = voices.filter((voice) => normalizeLang(voice.lang).startsWith("en"));

  if (englishVoices.length === 0) {
    return undefined;
  }

  const exactLangVoices = englishVoices.filter((voice) => normalizeLang(voice.lang) === normalizedPreferredLang);
  const candidateVoices = exactLangVoices.length > 0 ? exactLangVoices : englishVoices;

  return (
    candidateVoices.find((voice) =>
      preferredVoiceNames.some((preferredName) => voice.name.toLowerCase().includes(preferredName))
    ) ??
    candidateVoices.find((voice) => voice.localService) ??
    candidateVoices[0]
  );
}

function stopServerAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = undefined;
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = undefined;
  }
}

async function loadVoices(synth: SpeechSynthesis) {
  const initialVoices = synth.getVoices();

  if (initialVoices.length > 0) {
    return initialVoices;
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = window.setTimeout(() => {
      synth.onvoiceschanged = previousHandler;
      resolve(synth.getVoices());
    }, 350);
    const previousHandler = synth.onvoiceschanged;

    synth.onvoiceschanged = (event) => {
      window.clearTimeout(timeout);
      synth.onvoiceschanged = previousHandler;

      if (typeof previousHandler === "function") {
        previousHandler.call(synth, event);
      }

      resolve(synth.getVoices());
    };
  });
}

export function stopEnglishSpeech() {
  const synth = getSpeechSynthesis();

  stopServerAudio();

  if (!synth) {
    return;
  }

  synth.cancel();
}

async function speakWithServerTts(text: string, options: SpeakEnglishOptions): Promise<SpeakEnglishResult> {
  if (typeof window === "undefined" || typeof Audio === "undefined" || typeof fetch === "undefined") {
    return {
      ok: false,
      message: "当前环境不支持高质量 TTS 播放。"
    };
  }

  const cacheInput = {
    text,
    voice: options.voice,
    format: options.format,
    instructions: options.instructions ?? "Speak clearly and slowly for a beginner English learner."
  };
  const cachedAudio = await readCachedTtsAudio(cacheInput);

  if (cachedAudio) {
    stopEnglishSpeech();
    activeAudioUrl = URL.createObjectURL(cachedAudio.blob);
    activeAudio = new Audio(activeAudioUrl);
    activeAudio.addEventListener(
      "ended",
      () => {
        stopServerAudio();
      },
      { once: true }
    );
    await activeAudio.play();

    return {
      ok: true,
      message: `正在使用缓存的 ${cachedAudio.provider ?? "高质量 TTS"} 朗读。`,
      voiceName: cachedAudio.voice
    };
  }

  try {
    const response = await fetch("/api/speech/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice: options.voice,
        format: options.format,
        instructions: cacheInput.instructions
      })
    });

    const contentType = response.headers.get("Content-Type") ?? "";

    if (!response.ok) {
      return {
        ok: false,
        message: "高质量 TTS 暂不可用。"
      };
    }

    if (!contentType.startsWith("audio/")) {
      const payload = (await response.json()) as {
        synthesis?: {
          error?: string;
          provider?: string;
        };
      };

      return {
        ok: false,
        message: payload.synthesis?.error ?? payload.synthesis?.provider ?? "高质量 TTS 未配置。"
      };
    }

    const blob = await response.blob();
    const provider = decodeSpeechHeaderValue(response.headers.get("X-Speech-Provider"));
    const voice = decodeSpeechHeaderValue(response.headers.get("X-Speech-Voice"));
    await writeCachedTtsAudio(cacheInput, blob, {
      contentType,
      provider,
      voice
    });

    stopEnglishSpeech();
    activeAudioUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeAudioUrl);
    activeAudio.addEventListener(
      "ended",
      () => {
        stopServerAudio();
      },
      { once: true }
    );
    await activeAudio.play();

    return {
      ok: true,
      message: `正在使用 ${provider ?? "高质量 TTS"} 朗读。`,
      voiceName: voice
    };
  } catch {
    return {
      ok: false,
      message: "高质量 TTS 播放失败，已准备回退到浏览器朗读。"
    };
  }
}

export async function speakEnglishText(text: string, options: SpeakEnglishOptions = {}): Promise<SpeakEnglishResult> {
  const synth = getSpeechSynthesis();
  const cleanText = text.trim();

  if (!cleanText) {
    return {
      ok: false,
      message: "没有可播放的英文内容。"
    };
  }

  if (options.preferServer !== false) {
    const serverResult = await speakWithServerTts(cleanText, options);

    if (serverResult.ok) {
      return serverResult;
    }
  }

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    return {
      ok: false,
      message: "当前浏览器不支持本地英文朗读。"
    };
  }

  const lang = options.lang ?? "en-US";
  const voices = await loadVoices(synth);
  const voice = selectEnglishVoice(voices, lang);
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.lang = voice?.lang ?? lang;
  utterance.voice = voice ?? null;
  utterance.rate = options.rate ?? 0.86;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;

  stopServerAudio();
  synth.cancel();

  if (synth.paused) {
    synth.resume();
  }

  synth.speak(utterance);

  return {
    ok: true,
    message: voice ? `正在使用 ${voice.name} 朗读。` : "正在使用浏览器默认英文语音朗读。",
    voiceName: voice?.name
  };
}
