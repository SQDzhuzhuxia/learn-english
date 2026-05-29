import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSyncSnapshotFingerprint,
  loadAutoSyncUploadState,
  loadAutoSyncPreference,
  loadCloudSyncLastEvent,
  saveCloudSyncLastEvent,
  saveAutoSyncPreference,
  saveAutoSyncUploadState,
  shouldUploadSyncSnapshot
} from "@/lib/sync/auto-sync";
import { createSyncSnapshotFromRecords } from "@/lib/sync/sync-snapshot";

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

describe("auto sync preferences", () => {
  it("stores the auto sync preference locally", () => {
    expect(loadAutoSyncPreference()).toBe(false);

    saveAutoSyncPreference(true);
    expect(loadAutoSyncPreference()).toBe(true);

    saveAutoSyncPreference(false);
    expect(loadAutoSyncPreference()).toBe(false);
  });

  it("creates stable fingerprints from sync snapshots", () => {
    const first = createSyncSnapshotFromRecords(
      {
        "learn-english.review-cards.v1": "[2]",
        "learn-english.materials.v1": "[1]"
      },
      {
        deviceId: "test"
      }
    );
    const second = createSyncSnapshotFromRecords(
      {
        "learn-english.materials.v1": "[1]",
        "learn-english.review-cards.v1": "[2]"
      },
      {
        deviceId: "test"
      }
    );
    const changed = createSyncSnapshotFromRecords(
      {
        "learn-english.materials.v1": "[3]"
      },
      {
        deviceId: "test"
      }
    );

    expect(createSyncSnapshotFingerprint(first)).toBe(createSyncSnapshotFingerprint(second));
    expect(createSyncSnapshotFingerprint(first)).not.toBe(createSyncSnapshotFingerprint(changed));
  });

  it("skips upload when the latest fingerprint already synced", () => {
    saveAutoSyncUploadState("hash-1", "2026-05-29T00:00:00.000Z");

    expect(loadAutoSyncUploadState()).toEqual({
      fingerprint: "hash-1",
      uploadedAt: "2026-05-29T00:00:00.000Z"
    });
    expect(shouldUploadSyncSnapshot("hash-1")).toBe(false);
    expect(shouldUploadSyncSnapshot("hash-2")).toBe(true);
  });

  it("stores the latest cloud sync event", () => {
    expect(loadCloudSyncLastEvent()).toBeNull();

    saveCloudSyncLastEvent({
      type: "manual-upload",
      message: "已上传 3 组数据。",
      occurredAt: "2026-05-29T00:00:00.000Z",
      recordCount: 3,
      totalBytes: 120
    });

    expect(loadCloudSyncLastEvent()).toEqual({
      type: "manual-upload",
      message: "已上传 3 组数据。",
      occurredAt: "2026-05-29T00:00:00.000Z",
      recordCount: 3,
      totalBytes: 120
    });
  });
});
