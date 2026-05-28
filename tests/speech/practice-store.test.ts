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
      durationSeconds: 8
    });

    const attempts = loadPracticeAttempts();

    expect(attempt.status).toBe("recorded");
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.prompt).toContain("appointment");
  });
});
