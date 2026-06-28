import { decodeSpeechHeaderValue, encodeSpeechHeaderValue } from "@/lib/speech/speech-header-codec";

export type TtsAudioCacheInput = {
  text: string;
  voice?: string;
  format?: string;
  instructions?: string;
};

export type CachedTtsAudio = {
  blob: Blob;
  contentType: string;
  provider?: string;
  voice?: string;
};

const TTS_AUDIO_CACHE_NAME = "learn-english-tts-audio-v1";
const TTS_AUDIO_CACHE_PATH = "/__learn_english_tts_audio_cache__/";
const MAX_CACHEABLE_TEXT_LENGTH = 1200;
const MAX_TTS_AUDIO_CACHE_ENTRIES = 80;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createStableTextHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function canUseCacheApi() {
  return (
    typeof window !== "undefined" &&
    typeof caches !== "undefined" &&
    typeof Request !== "undefined" &&
    typeof Response !== "undefined"
  );
}

export function canCacheTtsAudio(input: TtsAudioCacheInput) {
  const text = normalizeText(input.text);
  return text.length > 0 && text.length <= MAX_CACHEABLE_TEXT_LENGTH;
}

export function createTtsAudioCacheId(input: TtsAudioCacheInput) {
  const normalized = {
    text: normalizeText(input.text),
    voice: input.voice?.trim() ?? "",
    format: input.format?.trim() ?? "mp3",
    instructions: input.instructions?.trim() ?? ""
  };

  return createStableTextHash(JSON.stringify(normalized));
}

function createTtsAudioCacheRequest(input: TtsAudioCacheInput) {
  if (!canUseCacheApi()) {
    return undefined;
  }

  const url = new URL(`${TTS_AUDIO_CACHE_PATH}${createTtsAudioCacheId(input)}`, window.location.origin);
  return new Request(url.toString(), {
    method: "GET"
  });
}

async function trimTtsAudioCache(cache: Cache) {
  const requests = await cache.keys();

  if (requests.length <= MAX_TTS_AUDIO_CACHE_ENTRIES) {
    return;
  }

  const staleRequests = requests.slice(0, requests.length - MAX_TTS_AUDIO_CACHE_ENTRIES);
  await Promise.all(staleRequests.map((request) => cache.delete(request)));
}

export async function readCachedTtsAudio(input: TtsAudioCacheInput): Promise<CachedTtsAudio | undefined> {
  if (!canCacheTtsAudio(input)) {
    return undefined;
  }

  const request = createTtsAudioCacheRequest(input);

  if (!request) {
    return undefined;
  }

  try {
    const cache = await caches.open(TTS_AUDIO_CACHE_NAME);
    const response = await cache.match(request);

    if (!response) {
      return undefined;
    }

    const contentType = response.headers.get("Content-Type") ?? "";

    if (!contentType.startsWith("audio/")) {
      await cache.delete(request);
      return undefined;
    }

    return {
      blob: await response.blob(),
      contentType,
      provider: decodeSpeechHeaderValue(response.headers.get("X-Speech-Provider")),
      voice: decodeSpeechHeaderValue(response.headers.get("X-Speech-Voice"))
    };
  } catch {
    return undefined;
  }
}

export async function writeCachedTtsAudio(
  input: TtsAudioCacheInput,
  audio: Blob,
  metadata: {
    contentType: string;
    provider?: string;
    voice?: string;
  }
) {
  if (!canCacheTtsAudio(input)) {
    return false;
  }

  const request = createTtsAudioCacheRequest(input);

  if (!request) {
    return false;
  }

  try {
    const cache = await caches.open(TTS_AUDIO_CACHE_NAME);
    await cache.put(
      request,
      new Response(audio, {
        headers: {
          "Content-Type": metadata.contentType,
          "X-Speech-Provider": encodeSpeechHeaderValue(metadata.provider ?? "cached TTS") ?? "cached%20TTS",
          ...(encodeSpeechHeaderValue(metadata.voice) ? { "X-Speech-Voice": encodeSpeechHeaderValue(metadata.voice) } : {}),
          "X-Cached-At": new Date().toISOString()
        }
      })
    );
    await trimTtsAudioCache(cache);
    return true;
  } catch {
    return false;
  }
}

export async function clearCachedTtsAudio() {
  if (!canUseCacheApi()) {
    return false;
  }

  try {
    return await caches.delete(TTS_AUDIO_CACHE_NAME);
  } catch {
    return false;
  }
}
