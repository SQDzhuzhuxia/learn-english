import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalBackup, parseLocalBackup, restoreLocalBackup } from "@/lib/sync/local-backup";

function setupLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
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

describe("local backup", () => {
  it("exports only learn-english localStorage keys", () => {
    window.localStorage.setItem("learn-english.materials.v1", "[1]");
    window.localStorage.setItem("other-app", "ignore");

    const backup = createLocalBackup();

    expect(backup.app).toBe("learn-english");
    expect(backup.records["learn-english.materials.v1"]).toBe("[1]");
    expect(backup.records["other-app"]).toBeUndefined();
  });

  it("restores valid backup records", () => {
    const payload = parseLocalBackup(
      JSON.stringify({
        app: "learn-english",
        version: 1,
        exportedAt: "2026-05-28T00:00:00.000Z",
        records: {
          "learn-english.review-cards.v1": "[2]",
          "bad-key": "ignore"
        }
      })
    );

    expect(restoreLocalBackup(payload)).toBe(1);
    expect(window.localStorage.getItem("learn-english.review-cards.v1")).toBe("[2]");
    expect(window.localStorage.getItem("bad-key")).toBeNull();
  });
});
