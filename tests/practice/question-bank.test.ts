import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDuePracticeQuestions,
  loadPracticeQuestionAttempts,
  loadPracticeQuestions,
  reviewPracticeQuestion,
  upsertPracticeQuestionsFromSet
} from "@/lib/practice/question-bank";
import type { AiGeneratedPracticeSet } from "@/lib/ai/types";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
}

function practiceSet(): AiGeneratedPracticeSet {
  return {
    materialTitle: "A Visit to the Doctor",
    level: "A1",
    focus: "预约医生",
    source: "fallback",
    provider: "test",
    generatedAt: "2026-06-27T00:00:00.000Z",
    drills: [
      {
        type: "cloze",
        title: "预约填空",
        instruction: "补出空格。",
        prompt: "I would like to make an ____.",
        answer: "appointment",
        hints: ["make an appointment"],
        choices: ["appointment", "account"],
        explanationZh: "练习预约表达。",
        estimatedMinutes: 2
      },
      {
        type: "writing",
        title: "写一句预约",
        instruction: "写一句你会用的话。",
        prompt: "Write one sentence about making an appointment.",
        answer: "I would like to make an appointment.",
        hints: ["would like to"],
        explanationZh: "练习输出。",
        estimatedMinutes: 4
      }
    ]
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-27T08:00:00.000Z"));
  setupLocalStorage();
});

describe("practice question bank", () => {
  it("imports generated practice drills and deduplicates them", () => {
    const first = upsertPracticeQuestionsFromSet({
      materialId: "doctor-visit",
      practiceSet: practiceSet()
    });
    const second = upsertPracticeQuestionsFromSet({
      materialId: "doctor-visit",
      practiceSet: practiceSet()
    });

    expect(first.created).toBe(2);
    expect(first.updated).toBe(0);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(2);
    expect(loadPracticeQuestions()).toHaveLength(2);
  });

  it("returns due generated questions", () => {
    upsertPracticeQuestionsFromSet({
      materialId: "doctor-visit",
      practiceSet: practiceSet()
    });

    const due = getDuePracticeQuestions(new Date("2026-06-27T08:01:00.000Z"));

    expect(due).toHaveLength(2);
    expect(due[0]?.materialTitle).toBe("A Visit to the Doctor");
  });

  it("reviews a question and schedules the next due date", () => {
    const imported = upsertPracticeQuestionsFromSet({
      materialId: "doctor-visit",
      practiceSet: practiceSet()
    });
    const questionId = imported.questions[0]!.id;
    const result = reviewPracticeQuestion({
      questionId,
      rating: "good",
      userAnswer: "appointment",
      correct: true
    });

    expect(result?.question.intervalDays).toBe(4);
    expect(result?.question.attemptCount).toBe(1);
    expect(result?.question.correctCount).toBe(1);
    expect(loadPracticeQuestionAttempts()).toHaveLength(1);
    expect(getDuePracticeQuestions(new Date("2026-06-28T08:00:00.000Z"))).toHaveLength(1);
  });
});
