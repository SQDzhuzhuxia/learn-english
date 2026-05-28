import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadStudyActivities,
  recordStudyActivity,
  summarizeStudyActivities
} from "@/lib/analytics/progress-store";

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

describe("progress-store", () => {
  it("records study activities in local storage", () => {
    recordStudyActivity({
      type: "input",
      label: "学习材料",
      minutes: 3,
      createdAt: "2026-05-28T10:00:00.000Z"
    });

    expect(loadStudyActivities()).toHaveLength(1);
  });

  it("summarizes current week activity by mode", () => {
    const records = [
      {
        id: "a1",
        type: "input" as const,
        label: "输入",
        minutes: 10,
        createdAt: "2026-05-28T10:00:00.000Z"
      },
      {
        id: "a2",
        type: "review" as const,
        label: "复习",
        minutes: 2,
        createdAt: "2026-05-28T10:10:00.000Z"
      },
      {
        id: "a3",
        type: "asset" as const,
        label: "保存词句",
        minutes: 0,
        createdAt: "2026-05-28T10:20:00.000Z"
      }
    ];

    const summary = summarizeStudyActivities(records, new Date("2026-05-28T12:00:00.000Z"));
    const thursday = summary.weeklyTimeline.find((day) => day.day === "周四");

    expect(summary.inputMinutes).toBe(10);
    expect(summary.reviewMinutes).toBe(2);
    expect(summary.reviewEvents).toBe(1);
    expect(summary.assetEvents).toBe(1);
    expect(thursday?.input).toBe(10);
    expect(thursday?.review).toBe(2);
  });
});
