"use client";

export type PracticeAttemptRecord = {
  id: string;
  type: "shadowing" | "retelling" | "writing" | "roleplay";
  prompt: string;
  materialTitle: string;
  durationSeconds: number;
  status: "recorded" | "transcribed" | "reviewed";
  createdAt: string;
};

const PRACTICE_ATTEMPTS_KEY = "learn-english.practice-attempts.v1";
const MAX_ATTEMPTS = 200;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadPracticeAttempts() {
  return readJson<PracticeAttemptRecord[]>(PRACTICE_ATTEMPTS_KEY, []);
}

export function savePracticeAttempts(attempts: PracticeAttemptRecord[]) {
  writeJson(PRACTICE_ATTEMPTS_KEY, attempts.slice(0, MAX_ATTEMPTS));
}

export function addPracticeAttempt(input: Omit<PracticeAttemptRecord, "id" | "createdAt" | "status">) {
  const createdAt = new Date().toISOString();
  const attempt: PracticeAttemptRecord = {
    ...input,
    id: `attempt-${Date.parse(createdAt)}-${Math.random().toString(36).slice(2, 8)}`,
    status: "recorded",
    createdAt
  };

  savePracticeAttempts([attempt, ...loadPracticeAttempts()]);
  return attempt;
}
