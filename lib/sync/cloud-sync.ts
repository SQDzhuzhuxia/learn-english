import { summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import { isSyncableStorageKey } from "@/lib/sync/sync-snapshot";
import type { SyncSnapshotPayload, SyncableStorageKey } from "@/lib/sync/sync-snapshot";

type SyncError = {
  message: string;
};

type QueryResult<T = unknown> = PromiseLike<{
  data?: T;
  error?: SyncError | null;
}>;

type SyncMutationValue = Record<string, unknown> | Array<Record<string, unknown>>;

type SyncTableClient = {
  upsert?: (values: SyncMutationValue, options?: { onConflict?: string }) => QueryResult;
  insert?: (values: SyncMutationValue) => QueryResult;
  select?: (columns: string) => {
    eq: (column: string, value: string) => QueryResult<CloudSyncRecordRow[]>;
  };
};

export type CloudSyncClient = {
  from: (table: string) => SyncTableClient;
};

export type UploadSyncSnapshotResult = {
  uploadedRecords: number;
  snapshotSaved: boolean;
  totalBytes: number;
};

export type CloudSyncRecordRow = {
  storage_key: string;
  storage_value: string;
  value_hash: string;
  server_updated_at?: string;
};

export type DownloadSyncRecordsResult = {
  records: Partial<Record<SyncableStorageKey, string>>;
  downloadedRecords: number;
};

function assertNoSyncError(result: { error?: SyncError | null }, fallback: string) {
  if (result.error) {
    throw new Error(result.error.message || fallback);
  }
}

export async function uploadSyncSnapshot(
  client: CloudSyncClient,
  userId: string,
  snapshot: SyncSnapshotPayload
): Promise<UploadSyncSnapshotResult> {
  const summary = summarizeSyncSnapshot(snapshot);
  const recordRows = snapshot.records.map((record) => ({
    user_id: userId,
    storage_key: record.key,
    storage_value: record.value,
    value_hash: record.hash,
    size_bytes: record.sizeBytes,
    device_id: snapshot.deviceId,
    client_updated_at: snapshot.exportedAt,
    server_updated_at: new Date().toISOString()
  }));

  if (recordRows.length > 0) {
    const recordsTable = client.from("learning_sync_records");

    if (!recordsTable.upsert) {
      throw new Error("云同步 records 表不支持 upsert。");
    }

    const upsertResult = await recordsTable.upsert(recordRows, {
      onConflict: "user_id,storage_key"
    });

    assertNoSyncError(upsertResult, "云同步 records 上传失败。");
  }

  const snapshotsTable = client.from("learning_sync_snapshots");

  if (!snapshotsTable.insert) {
    throw new Error("云同步 snapshots 表不支持 insert。");
  }

  const snapshotResult = await snapshotsTable.insert({
    user_id: userId,
    device_id: snapshot.deviceId,
    schema_version: snapshot.schemaVersion,
    record_count: summary.recordCount,
    total_bytes: summary.totalBytes,
    records: snapshot.records
  });

  assertNoSyncError(snapshotResult, "云同步 snapshot 保存失败。");

  return {
    uploadedRecords: recordRows.length,
    snapshotSaved: true,
    totalBytes: summary.totalBytes
  };
}

export async function downloadSyncRecords(
  client: CloudSyncClient,
  userId: string
): Promise<DownloadSyncRecordsResult> {
  const recordsTable = client.from("learning_sync_records");

  if (!recordsTable.select) {
    throw new Error("云同步 records 表不支持 select。");
  }

  const result = await recordsTable
    .select("storage_key,storage_value,value_hash,server_updated_at")
    .eq("user_id", userId);

  assertNoSyncError(result, "云同步 records 拉取失败。");

  const records = (result.data ?? []).reduce<Partial<Record<SyncableStorageKey, string>>>((nextRecords, row) => {
    if (isSyncableStorageKey(row.storage_key)) {
      nextRecords[row.storage_key] = row.storage_value;
    }

    return nextRecords;
  }, {});

  return {
    records,
    downloadedRecords: Object.keys(records).length
  };
}
