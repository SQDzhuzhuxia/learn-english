"use client";

import { getNextReviewDate, getReviewIntervalDays, type ReviewRating } from "@/lib/review/scheduler";
import type { AiGeneratedPracticeDrill, AiGeneratedPracticeSet, GeneratedPracticeDrillType } from "@/lib/ai/types";

export type PracticeQuestionStatus = "new" | "learning" | "review" | "suspended";

export type PracticeQuestionRecord = {
  id: string;
  materialId?: string;
  materialTitle: string;
  type: GeneratedPracticeDrillType;
  title: string;
  instruction: string;
  prompt: string;
  answer: string;
  hints: string[];
  choices?: string[];
  explanationZh: string;
  level: string;
  source: "model" | "fallback" | "manual";
  provider: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  status: PracticeQuestionStatus;
  attemptCount: number;
  correctCount: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
};

export type PracticeQuestionAttemptRecord = {
  id: string;
  questionId: string;
  rating: ReviewRating;
  userAnswer?: string;
  correct: boolean;
  reviewedAt: string;
  nextDueAt: string;
};

export type PracticeQuestionImportSummary = {
  created: number;
  updated: number;
  questions: PracticeQuestionRecord[];
};

const PRACTICE_QUESTIONS_KEY = "learn-english.practice-questions.v1";
const PRACTICE_QUESTION_ATTEMPTS_KEY = "learn-english.practice-question-attempts.v1";
const MAX_QUESTIONS = 10000;
const MAX_ATTEMPTS = 20000;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
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

function stableHash(text: string) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function createQuestionId(input: {
  materialId?: string;
  materialTitle: string;
  type: GeneratedPracticeDrillType;
  prompt: string;
  answer: string;
}) {
  return `practice-question-${stableHash(
    [
      input.materialId ?? input.materialTitle,
      input.type,
      input.prompt.trim().toLowerCase(),
      input.answer.trim().toLowerCase()
    ].join("|")
  )}`;
}

function normalizeQuestion(question: PracticeQuestionRecord): PracticeQuestionRecord {
  return {
    ...question,
    status: question.status ?? "new",
    intervalDays: question.intervalDays ?? 0,
    ease: question.ease ?? 2.5,
    attemptCount: question.attemptCount ?? 0,
    correctCount: question.correctCount ?? 0,
    updatedAt: question.updatedAt ?? question.createdAt
  };
}

export function loadPracticeQuestions() {
  const questions = readJson<PracticeQuestionRecord[]>(PRACTICE_QUESTIONS_KEY, []).map(normalizeQuestion);

  if (canUseStorage()) {
    savePracticeQuestions(questions);
  }

  return questions;
}

export function savePracticeQuestions(questions: PracticeQuestionRecord[]) {
  writeJson(PRACTICE_QUESTIONS_KEY, questions.slice(0, MAX_QUESTIONS));
}

export function loadPracticeQuestionAttempts() {
  return readJson<PracticeQuestionAttemptRecord[]>(PRACTICE_QUESTION_ATTEMPTS_KEY, []);
}

export function savePracticeQuestionAttempts(attempts: PracticeQuestionAttemptRecord[]) {
  writeJson(PRACTICE_QUESTION_ATTEMPTS_KEY, attempts.slice(0, MAX_ATTEMPTS));
}

function createQuestionFromDrill(input: {
  materialId?: string;
  materialTitle: string;
  level: string;
  source: PracticeQuestionRecord["source"];
  provider: string;
  drill: AiGeneratedPracticeDrill;
  timestamp: string;
}): PracticeQuestionRecord {
  const id = createQuestionId({
    materialId: input.materialId,
    materialTitle: input.materialTitle,
    type: input.drill.type,
    prompt: input.drill.prompt,
    answer: input.drill.answer
  });

  return {
    id,
    materialId: input.materialId,
    materialTitle: input.materialTitle,
    type: input.drill.type,
    title: input.drill.title,
    instruction: input.drill.instruction,
    prompt: input.drill.prompt,
    answer: input.drill.answer,
    hints: input.drill.hints,
    choices: input.drill.choices,
    explanationZh: input.drill.explanationZh,
    level: input.level,
    source: input.source,
    provider: input.provider,
    dueAt: input.timestamp,
    intervalDays: 0,
    ease: 2.5,
    status: "new",
    attemptCount: 0,
    correctCount: 0,
    createdAt: input.timestamp,
    updatedAt: input.timestamp
  };
}

export function upsertPracticeQuestionsFromSet(input: {
  materialId?: string;
  practiceSet: AiGeneratedPracticeSet;
}): PracticeQuestionImportSummary {
  const timestamp = nowIso();
  const existingQuestions = loadPracticeQuestions();
  const existingById = new Map(existingQuestions.map((question) => [question.id, question]));
  let created = 0;
  let updated = 0;
  const importedQuestions = input.practiceSet.drills.map((drill) =>
    createQuestionFromDrill({
      materialId: input.materialId,
      materialTitle: input.practiceSet.materialTitle,
      level: input.practiceSet.level,
      source: input.practiceSet.source,
      provider: input.practiceSet.provider,
      drill,
      timestamp
    })
  );

  importedQuestions.forEach((question) => {
    const existing = existingById.get(question.id);

    if (existing) {
      updated += 1;
      existingById.set(question.id, {
        ...existing,
        title: question.title,
        instruction: question.instruction,
        hints: question.hints,
        choices: question.choices,
        explanationZh: question.explanationZh,
        provider: question.provider,
        updatedAt: timestamp
      });
      return;
    }

    created += 1;
    existingById.set(question.id, question);
  });

  const nextQuestions = Array.from(existingById.values()).sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );

  savePracticeQuestions(nextQuestions);

  return {
    created,
    updated,
    questions: importedQuestions.map((question) => existingById.get(question.id) ?? question)
  };
}

export function getDuePracticeQuestions(referenceDate = new Date(), limit = 10) {
  return loadPracticeQuestions()
    .filter((question) => question.status !== "suspended")
    .filter((question) => Date.parse(question.dueAt) <= referenceDate.getTime())
    .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))
    .slice(0, limit);
}

export function reviewPracticeQuestion(input: {
  questionId: string;
  rating: ReviewRating;
  userAnswer?: string;
  correct?: boolean;
}) {
  const reviewedAt = new Date();
  const nextDueAt = getNextReviewDate(input.rating, reviewedAt).toISOString();
  const intervalDays = getReviewIntervalDays(input.rating);
  const correct = input.correct ?? (input.rating === "good" || input.rating === "easy");
  let updatedQuestion: PracticeQuestionRecord | undefined;

  const questions = loadPracticeQuestions().map((question) => {
    if (question.id !== input.questionId) {
      return question;
    }

    updatedQuestion = {
      ...question,
      dueAt: nextDueAt,
      intervalDays,
      status: "review",
      attemptCount: question.attemptCount + 1,
      correctCount: question.correctCount + (correct ? 1 : 0),
      lastReviewedAt: reviewedAt.toISOString(),
      updatedAt: reviewedAt.toISOString()
    };

    return updatedQuestion;
  });

  if (!updatedQuestion) {
    return undefined;
  }

  const attempt: PracticeQuestionAttemptRecord = {
    id: `practice-question-attempt-${input.questionId}-${reviewedAt.getTime()}`,
    questionId: input.questionId,
    rating: input.rating,
    userAnswer: input.userAnswer,
    correct,
    reviewedAt: reviewedAt.toISOString(),
    nextDueAt
  };

  savePracticeQuestions(questions);
  savePracticeQuestionAttempts([attempt, ...loadPracticeQuestionAttempts()]);

  return {
    question: updatedQuestion,
    attempt
  };
}
