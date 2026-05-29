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
  hashes: Partial<Record<SyncableStorageKey, string>>;
  downloadedRecords: number;
};

export type SyncRecordComparison = {
  same: number;
  localOnly: number;
  remoteOnly: number;
  changed: number;
};

export type SyncRecordMergeStatus = "same" | "local-only" | "remote-only" | "changed";

export type SyncRecordMergePlanItem = {
  key: SyncableStorageKey;
  status: SyncRecordMergeStatus;
  localHash?: string;
  remoteHash?: string;
  willRestore: boolean;
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

  const rows = result.data ?? [];
  const records = rows.reduce<Partial<Record<SyncableStorageKey, string>>>((nextRecords, row) => {
    if (isSyncableStorageKey(row.storage_key)) {
      nextRecords[row.storage_key] = row.storage_value;
    }

    return nextRecords;
  }, {});
  const hashes = rows.reduce<Partial<Record<SyncableStorageKey, string>>>((nextHashes, row) => {
    if (isSyncableStorageKey(row.storage_key)) {
      nextHashes[row.storage_key] = row.value_hash;
    }

    return nextHashes;
  }, {});

  return {
    records,
    hashes,
    downloadedRecords: Object.keys(records).length
  };
}

export function compareSyncHashes(
  localHashes: Partial<Record<SyncableStorageKey, string>>,
  remoteHashes: Partial<Record<SyncableStorageKey, string>>
): SyncRecordComparison {
  const localKeys = Object.keys(localHashes).filter(isSyncableStorageKey);
  const remoteKeys = Object.keys(remoteHashes).filter(isSyncableStorageKey);
  const allKeys = new Set<SyncableStorageKey>([...localKeys, ...remoteKeys]);
  const comparison: SyncRecordComparison = {
    same: 0,
    localOnly: 0,
    remoteOnly: 0,
    changed: 0
  };

  allKeys.forEach((key) => {
    const localHash = localHashes[key];
    const remoteHash = remoteHashes[key];

    if (localHash && remoteHash && localHash === remoteHash) {
      comparison.same += 1;
    } else if (localHash && remoteHash && localHash !== remoteHash) {
      comparison.changed += 1;
    } else if (localHash) {
      comparison.localOnly += 1;
    } else {
      comparison.remoteOnly += 1;
    }
  });

  return comparison;
}

export function createSyncMergePlan(
  localHashes: Partial<Record<SyncableStorageKey, string>>,
  remoteHashes: Partial<Record<SyncableStorageKey, string>>
): SyncRecordMergePlanItem[] {
  const localKeys = Object.keys(localHashes).filter(isSyncableStorageKey);
  const remoteKeys = Object.keys(remoteHashes).filter(isSyncableStorageKey);
  const allKeys = Array.from(new Set<SyncableStorageKey>([...localKeys, ...remoteKeys])).sort();

  return allKeys.map((key) => {
    const localHash = localHashes[key];
    const remoteHash = remoteHashes[key];

    if (localHash && remoteHash && localHash === remoteHash) {
      return {
        key,
        status: "same",
        localHash,
        remoteHash,
        willRestore: false
      };
    }

    if (localHash && remoteHash && localHash !== remoteHash) {
      return {
        key,
        status: "changed",
        localHash,
        remoteHash,
        willRestore: true
      };
    }

    if (localHash) {
      return {
        key,
        status: "local-only",
        localHash,
        willRestore: false
      };
    }

    return {
      key,
      status: "remote-only",
      remoteHash,
      willRestore: true
    };
  });
}

export function pickRemoteRecordsToRestore(
  remoteRecords: Partial<Record<SyncableStorageKey, string>>,
  mergePlan: SyncRecordMergePlanItem[]
) {
  return mergePlan.reduce<Partial<Record<SyncableStorageKey, string>>>((records, item) => {
    const value = remoteRecords[item.key];

    if (item.willRestore && typeof value === "string") {
      records[item.key] = value;
    }

    return records;
  }, {});
}
