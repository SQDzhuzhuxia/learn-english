"use client";

import type { AiSegmentExplanation } from "@/lib/ai/types";

export const AI_EXPLANATION_CACHE_KEY = "learn-english.ai-segment-explanations.v1";

type AiExplanationCache = Record<string, AiSegmentExplanation>;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readAiExplanationCache() {
  if (!canUseLocalStorage()) {
    return {};
  }

  const raw = window.localStorage.getItem(AI_EXPLANATION_CACHE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as AiExplanationCache;
  } catch {
    window.localStorage.removeItem(AI_EXPLANATION_CACHE_KEY);
    return {};
  }
}

export function getCachedAiExplanation(cacheKey: string) {
  return readAiExplanationCache()[cacheKey];
}

export function setCachedAiExplanation(cacheKey: string, explanation: AiSegmentExplanation) {
  if (!canUseLocalStorage()) {
    return;
  }

  const cache = readAiExplanationCache();
  cache[cacheKey] = explanation;
  window.localStorage.setItem(AI_EXPLANATION_CACHE_KEY, JSON.stringify(cache));
}

export function setCachedAiExplanations(
  entries: Array<{ cacheKey: string; explanation: AiSegmentExplanation }>
) {
  if (!canUseLocalStorage()) {
    return;
  }

  const cache = readAiExplanationCache();
  entries.forEach((entry) => {
    cache[entry.cacheKey] = entry.explanation;
  });
  window.localStorage.setItem(AI_EXPLANATION_CACHE_KEY, JSON.stringify(cache));
}
