import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAiRequestQueue,
  createAiRequestFingerprint,
  enqueueAiRequest,
  loadAiRequestQueue,
  requestAiJsonWithQueue,
  retryQueuedAiRequests
} from "@/lib/ai/request-queue";
import { getCachedAiExplanation } from "@/lib/ai/explanation-cache";

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

  it("keeps request metadata for later automatic writeback", () => {
    enqueueAiRequest({
      kind: "explain-segment",
      endpoint: "/api/ai/explain-segment",
      payload: {
        sentence: "Could you repeat that?"
      },
      metadata: {
        cacheKey: "material-1:segment-1"
      },
      error: "offline"
    });
    const queue = loadAiRequestQueue();

    expect(queue[0]?.metadata).toEqual({
      cacheKey: "material-1:segment-1"
    });
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

  it("retries queued segment explanations and writes them back to cache", async () => {
    enqueueAiRequest({
      kind: "explain-segment",
      endpoint: "/api/ai/explain-segment",
      payload: {
        sentence: "I need to make an appointment."
      },
      metadata: {
        cacheKey: "doctor-visit:segment-1"
      },
      error: "offline"
    });

    const summary = await retryQueuedAiRequests({
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          explanation: {
            sentence: "I need to make an appointment.",
            meaningZh: "我需要预约。",
            structure: ["I need to + verb 表示我需要做某事。"],
            keyExpressions: [],
            commonMistake: "不要说 make a appointment。",
            shadowingTip: "把 need to 连读成 need-tuh。",
            source: "model",
            provider: "test",
            generatedAt: "2026-05-31T00:00:00.000Z"
          }
        })
      })
    });

    expect(summary.completed).toBe(1);
    expect(loadAiRequestQueue()).toEqual([]);
    expect(getCachedAiExplanation("doctor-visit:segment-1")?.meaningZh).toBe("我需要预约。");
  });

  it("keeps failed retry attempts in queue with the latest error", async () => {
    enqueueAiRequest({
      kind: "explain-material",
      endpoint: "/api/ai/explain-material",
      payload: {
        materialTitle: "Doctor Visit"
      },
      metadata: {
        materialId: "doctor-visit"
      },
      error: "offline"
    });

    const summary = await retryQueuedAiRequests({
      fetcher: vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "rate limited"
        })
      })
    });
    const queue = loadAiRequestQueue();

    expect(summary.failed).toBe(1);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.status).toBe("failed");
    expect(queue[0]?.attempts).toBe(2);
    expect(queue[0]?.lastError).toBe("rate limited");
  });

  it("skips queued requests that cannot be written back automatically", async () => {
    const fetcher = vi.fn();

    enqueueAiRequest({
      kind: "correct-writing",
      endpoint: "/api/ai/correct-writing",
      payload: {
        userText: "I want go bank."
      },
      error: "offline"
    });

    const summary = await retryQueuedAiRequests({ fetcher });

    expect(summary.attempted).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(loadAiRequestQueue()).toHaveLength(1);
  });
});
