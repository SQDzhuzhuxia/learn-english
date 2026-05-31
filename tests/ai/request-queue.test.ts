import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAiRequestQueue,
  createAiRequestFingerprint,
  enqueueAiRequest,
  loadAiRequestQueue,
  requestAiJsonWithQueue
} from "@/lib/ai/request-queue";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    }
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  setupLocalStorage();
});

describe("AI request queue", () => {
  it("creates stable fingerprints regardless of object key order", () => {
    const first = createAiRequestFingerprint({
      endpoint: "/api/ai/explain-segment",
      payload: {
        sentence: "Hello",
        level: "A1"
      }
    });
    const second = createAiRequestFingerprint({
      endpoint: "/api/ai/explain-segment",
      payload: {
        level: "A1",
        sentence: "Hello"
      }
    });

    expect(first).toBe(second);
  });

  it("deduplicates queued requests and increments attempts", () => {
    const first = enqueueAiRequest({
      kind: "explain-segment",
      endpoint: "/api/ai/explain-segment",
      payload: {
        sentence: "Could you repeat that?"
      },
      error: "offline"
    });
    const second = enqueueAiRequest({
      kind: "explain-segment",
      endpoint: "/api/ai/explain-segment",
      payload: {
        sentence: "Could you repeat that?"
      },
      error: "still offline"
    });
    const queue = loadAiRequestQueue();

    expect(second.id).toBe(first.id);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.attempts).toBe(2);
    expect(queue[0]?.lastError).toBe("still offline");
  });

  it("clears queued requests", () => {
    enqueueAiRequest({
      kind: "correct-writing",
      endpoint: "/api/ai/correct-writing",
      payload: {
        userText: "I want go bank."
      }
    });

    expect(clearAiRequestQueue()).toBe(1);
    expect(loadAiRequestQueue()).toEqual([]);
  });

  it("queues failed AI JSON requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await requestAiJsonWithQueue<{ ok: boolean }>({
      kind: "explain-material",
      endpoint: "/api/ai/explain-material",
      payload: {
        materialTitle: "Test"
      },
      errorMessage: "failed"
    });

    expect(result.queued).toBe(true);
    expect(loadAiRequestQueue()).toHaveLength(1);
  });

  it("returns successful AI JSON responses without queueing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );

    const result = await requestAiJsonWithQueue<{ ok: boolean }>({
      kind: "explain-material",
      endpoint: "/api/ai/explain-material",
      payload: {
        materialTitle: "Test"
      },
      errorMessage: "failed"
    });

    expect(result.queued).toBe(false);
    if (result.queued) {
      throw new Error("request should not be queued");
    }
    expect(result.payload.ok).toBe(true);
    expect(loadAiRequestQueue()).toEqual([]);
  });
});
