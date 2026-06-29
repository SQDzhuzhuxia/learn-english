import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFallbackPracticeSet } from "@/lib/ai/fallback-explanation";
import { createOutputWeaknessProfile } from "@/lib/analytics/output-weakness-profile";
import {
  addTextMaterial,
  findMaterialById,
  getCurrentMaterialId,
  updateMaterialProgress
} from "@/lib/content/material-store";
import {
  getDuePracticeQuestions,
  loadPracticeQuestionAttempts,
  reviewPracticeQuestion,
  upsertPracticeQuestionsFromSet
} from "@/lib/practice/question-bank";
import {
  loadLearningItems,
  loadReviewCards,
  saveSegmentAsReviewCard
} from "@/lib/review/review-store";
import { addPracticeAttempt, loadPracticeAttempts } from "@/lib/speech/practice-store";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      get length() {
        return store.size;
      },
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null
    }
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-29T08:00:00.000Z"));
  setupLocalStorage();
});

describe("local learning flow QA", () => {
  it("runs import, study, review, generated practice, and weakness profiling from real local stores", () => {
    const material = addTextMaterial({
      title: "Ask the Landlord About Repairs",
      type: "租房",
      level: "A1+",
      contentText:
        "The sink is leaking in my apartment. I would like to ask the landlord for a repair. Could someone come this afternoon?",
      audioUrl: "",
      audioCueText: ""
    });

    expect(getCurrentMaterialId()).toBe(material.id);
    expect(findMaterialById(material.id)?.title).toBe(material.title);

    const studied = updateMaterialProgress(material.id, 2);
    expect(studied?.progress).toBeGreaterThan(0);

    const savedSentence = saveSegmentAsReviewCard(material, material.segments[0]!);
    expect(savedSentence.created).toBe(true);
    expect(savedSentence.item).toBeDefined();
    expect(loadLearningItems().some((item) => item.sourceMaterialId === material.id)).toBe(true);
    expect(loadReviewCards().some((card) => card.learningItemId === savedSentence.item!.id)).toBe(true);

    const practiceSet = createFallbackPracticeSet({
      materialId: material.id,
      materialTitle: material.title,
      materialType: material.type,
      level: material.level,
      summary: material.summary,
      keyExpressions: material.keyExpressions,
      segments: material.segments.map((segment) => ({
        id: segment.id,
        order: segment.order,
        text: segment.text
      })),
      targetCount: 5
    });
    const importedQuestions = upsertPracticeQuestionsFromSet({
      materialId: material.id,
      practiceSet
    });
    expect(importedQuestions.created).toBeGreaterThan(0);

    const dueQuestion = getDuePracticeQuestions(new Date(), 1)[0]!;
    const reviewed = reviewPracticeQuestion({
      questionId: dueQuestion.id,
      rating: "good",
      userAnswer: dueQuestion.answer,
      correct: true
    });
    expect(reviewed?.attempt.userAnswer).toBe(dueQuestion.answer);
    expect(loadPracticeQuestionAttempts()).toHaveLength(1);

    addPracticeAttempt({
      type: "writing",
      prompt: "Write one sentence asking for a repair.",
      materialTitle: material.title,
      durationSeconds: 45,
      transcript: "I need the landlord repair my sink today because it is leaking",
      score: 48,
      feedback: "语法和自然度需要改进。搭配不自然，请改成更地道的维修请求。"
    });

    const profile = createOutputWeaknessProfile(loadPracticeAttempts());
    expect(profile.attemptCount).toBe(1);
    expect(profile.primaryFocus?.id).toBe("grammar-naturalness");
    expect(profile.nextTrainingPlan[0]?.href).toBe("/practice#practice-writing");
  });
});
