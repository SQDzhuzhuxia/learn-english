import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAiResultInboxItem,
  clearAiResultInbox,
  deleteAiResultInboxItem,
  loadAiResultInbox
} from "@/lib/ai/result-inbox";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    },
    dispatchEvent: vi.fn()
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  setupLocalStorage();
});

describe("AI result inbox", () => {
  it("adds and loads AI result records", () => {
    const record = addAiResultInboxItem({
      requestId: "request-1",
      kind: "correct-writing",
      title: "Work email",
      summary: "I want to go to the office.",
      endpoint: "/api/ai/correct-writing",
      requestPayload: {
        userText: "I want go office."
      },
      resultPayload: {
        correction: {
          correctedText: "I want to go to the office."
        }
      }
    });

    const inbox = loadAiResultInbox();

    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.id).toBe(record.id);
    expect(inbox[0]?.summary).toBe("I want to go to the office.");
  });

  it("updates existing records by request id", () => {
    const first = addAiResultInboxItem({
      requestId: "request-1",
      kind: "correct-writing",
      title: "Work email",
      summary: "first",
      endpoint: "/api/ai/correct-writing",
      requestPayload: {},
      resultPayload: {}
    });
    const second = addAiResultInboxItem({
      requestId: "request-1",
      kind: "correct-writing",
      title: "Work email",
      summary: "second",
      endpoint: "/api/ai/correct-writing",
      requestPayload: {},
      resultPayload: {}
    });
    const inbox = loadAiResultInbox();

    expect(second.id).toBe(first.id);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.summary).toBe("second");
  });

  it("stores generated practice sets as inbox records", () => {
    addAiResultInboxItem({
      requestId: "request-practice-1",
      kind: "generate-practice",
      title: "Opening a bank account",
      summary: "已生成 3 道练习：bank account questions",
      endpoint: "/api/ai/generate-practice",
      requestPayload: {
        materialTitle: "Opening a bank account"
      },
      resultPayload: {
        practiceSet: {
          materialTitle: "Opening a bank account",
          drills: []
        }
      }
    });

    const inbox = loadAiResultInbox();

    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.kind).toBe("generate-practice");
    expect(inbox[0]?.endpoint).toBe("/api/ai/generate-practice");
  });

  it("deletes and clears inbox records", () => {
    const record = addAiResultInboxItem({
      requestId: "request-1",
      kind: "roleplay-next",
      title: "Doctor appointment",
      summary: "Could you tell me your date of birth?",
      endpoint: "/api/ai/roleplay-next",
      requestPayload: {},
      resultPayload: {}
    });

    expect(deleteAiResultInboxItem(record.id)).toBe(1);
    expect(loadAiResultInbox()).toEqual([]);

    addAiResultInboxItem({
      requestId: "request-2",
      kind: "correct-writing",
      title: "Small talk",
      summary: "Nice to meet you.",
      endpoint: "/api/ai/correct-writing",
      requestPayload: {},
      resultPayload: {}
    });

    expect(clearAiResultInbox()).toBe(1);
    expect(loadAiResultInbox()).toEqual([]);
  });
});
