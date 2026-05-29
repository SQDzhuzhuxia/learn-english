import { beforeEach, describe, expect, it, vi } from "vitest";
import { addPracticeAttempt, loadPracticeAttempts } from "@/lib/speech/practice-store";

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

beforeEach(() => {
  vi.unstubAllGlobals();
  setupLocalStorage();
});

describe("practice-store", () => {
  it("saves local shadowing attempts", () => {
    const attempt = addPracticeAttempt({
      type: "shadowing",
      prompt: "I would like to make an appointment.",
      materialTitle: "A Visit to the Doctor",
      durationSeconds: 8,
      transcript: "I would like to make an appointment",
      score: 100,
      feedback: "这一遍已经比较完整。"
    });

    const attempts = loadPracticeAttempts();

    expect(attempt.status).toBe("transcribed");
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.prompt).toContain("appointment");
    expect(attempts[0]?.score).toBe(100);
  });

  it("saves local retelling attempts", () => {
    const attempt = addPracticeAttempt({
      type: "retelling",
      prompt: "Retell the doctor appointment in simple English.",
      materialTitle: "A Visit to the Doctor",
      durationSeconds: 45,
      transcript: "I need to make an appointment with a doctor.",
      score: 72,
      feedback: "大意基本到位。"
    });

    const attempts = loadPracticeAttempts();

    expect(attempt.status).toBe("transcribed");
    expect(attempts[0]?.type).toBe("retelling");
    expect(attempts[0]?.feedback).toContain("大意");
  });
});
