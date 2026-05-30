type SpeakEnglishOptions = {
  lang?: string;
  pitch?: number;
  rate?: number;
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

  if (!synth) {
    return;
  }

  synth.cancel();
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
