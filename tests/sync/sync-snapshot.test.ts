import { describe, expect, it } from "vitest";
import {
  createStableRecordHash,
  createSyncSnapshotFromRecords,
  isSyncableStorageKey,
  summarizeSyncSnapshot
} from "@/lib/sync/sync-snapshot";

describe("sync snapshot", () => {
  it("only includes known syncable learning keys", () => {
    const snapshot = createSyncSnapshotFromRecords(
      {
        "learn-english.materials.v1": "[1]",
        "learn-english.review-cards.v1": "[2]",
        "learn-english.practice-questions.v1": "[4]",
        "learn-english.unknown.v1": "[3]",
        "other-app": "ignore"
      },
      {
        deviceId: "test-device",
        exportedAt: "2026-05-29T00:00:00.000Z"
      }
    );

    expect(snapshot.app).toBe("learn-english");
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.deviceId).toBe("test-device");
    expect(snapshot.records.map((record) => record.key)).toEqual([
      "learn-english.materials.v1",
      "learn-english.practice-questions.v1",
      "learn-english.review-cards.v1"
    ]);
  });

  it("creates stable hashes and a compact summary", () => {
    const firstHash = createStableRecordHash("hello");
    const secondHash = createStableRecordHash("hello");
    const changedHash = createStableRecordHash("hello!");
    const snapshot = createSyncSnapshotFromRecords(
      {
        "learn-english.activity-log.v1": "hello"
      },
      {
        deviceId: "test-device",
        exportedAt: "2026-05-29T00:00:00.000Z"
      }
    );
    const summary = summarizeSyncSnapshot(snapshot);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(changedHash);
    expect(summary.recordCount).toBe(1);
    expect(summary.totalBytes).toBe(5);
    expect(summary.hashes["learn-english.activity-log.v1"]).toBe(firstHash);
  });

  it("recognizes syncable storage keys", () => {
    expect(isSyncableStorageKey("learn-english.practice-attempts.v1")).toBe(true);
    expect(isSyncableStorageKey("learn-english.practice-questions.v1")).toBe(true);
    expect(isSyncableStorageKey("learn-english.practice-question-attempts.v1")).toBe(true);
    expect(isSyncableStorageKey("learn-english.ai-result-inbox.v1")).toBe(true);
    expect(isSyncableStorageKey("learn-english.random.v1")).toBe(false);
  });
});
