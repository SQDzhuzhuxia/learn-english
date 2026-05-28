import { describe, expect, it, vi } from "vitest";
import { compareSyncHashes, downloadSyncRecords, uploadSyncSnapshot } from "@/lib/sync/cloud-sync";
import type { SyncSnapshotPayload } from "@/lib/sync/sync-snapshot";

function createSnapshot(): SyncSnapshotPayload {
  return {
    app: "learn-english",
    schemaVersion: 1,
    deviceId: "test-device",
    exportedAt: "2026-05-29T00:00:00.000Z",
    records: [
      {
        key: "learn-english.materials.v1",
        value: "[1]",
        hash: "abc",
        sizeBytes: 3
      }
    ]
  };
}

describe("uploadSyncSnapshot", () => {
  it("upserts records and stores a snapshot", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn((table: string) => ({
        upsert: table === "learning_sync_records" ? upsert : undefined,
        insert: table === "learning_sync_snapshots" ? insert : undefined
      }))
    };

    const result = await uploadSyncSnapshot(client, "user-1", createSnapshot());

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: "user-1",
          storage_key: "learn-english.materials.v1",
          value_hash: "abc"
        })
      ],
      {
        onConflict: "user_id,storage_key"
      }
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        device_id: "test-device",
        record_count: 1,
        total_bytes: 3
      })
    );
    expect(result.uploadedRecords).toBe(1);
    expect(result.snapshotSaved).toBe(true);
  });

  it("throws provider errors", async () => {
    const client = {
      from: () => ({
        upsert: vi.fn().mockResolvedValue({ error: { message: "upsert failed" } }),
        insert: vi.fn().mockResolvedValue({ error: null })
      })
    };

    await expect(uploadSyncSnapshot(client, "user-1", createSnapshot())).rejects.toThrow(
      "upsert failed"
    );
  });

  it("downloads syncable cloud records", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          storage_key: "learn-english.materials.v1",
          storage_value: "[1]",
          value_hash: "abc"
        },
        {
          storage_key: "learn-english.unknown.v1",
          storage_value: "[2]",
          value_hash: "ignore"
        }
      ],
      error: null
    });
    const select = vi.fn(() => ({ eq }));
    const client = {
      from: vi.fn(() => ({ select }))
    };

    const result = await downloadSyncRecords(client, "user-1");

    expect(select).toHaveBeenCalledWith("storage_key,storage_value,value_hash,server_updated_at");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.downloadedRecords).toBe(1);
    expect(result.records["learn-english.materials.v1"]).toBe("[1]");
    expect(result.hashes["learn-english.materials.v1"]).toBe("abc");
    expect("learn-english.unknown.v1" in result.records).toBe(false);
  });

  it("compares local and remote record hashes", () => {
    const comparison = compareSyncHashes(
      {
        "learn-english.materials.v1": "same",
        "learn-english.review-cards.v1": "local",
        "learn-english.review-logs.v1": "old"
      },
      {
        "learn-english.materials.v1": "same",
        "learn-english.activity-log.v1": "remote",
        "learn-english.review-logs.v1": "new"
      }
    );

    expect(comparison).toEqual({
      same: 1,
      localOnly: 1,
      remoteOnly: 1,
      changed: 1
    });
  });
});
