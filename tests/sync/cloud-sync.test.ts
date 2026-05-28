import { describe, expect, it, vi } from "vitest";
import { uploadSyncSnapshot } from "@/lib/sync/cloud-sync";
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
});
