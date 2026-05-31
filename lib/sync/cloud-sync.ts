import { createStableRecordHash, summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
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
export type SyncRecordRestoreAction = "none" | "restore-remote" | "merge-records" | "keep-local";

export type SyncRecordMergePlanItem = {
  key: SyncableStorageKey;
  status: SyncRecordMergeStatus;
  localHash?: string;
  remoteHash?: string;
  willRestore: boolean;
  action?: SyncRecordRestoreAction;
  mergedAdded?: number;
  mergedUpdated?: number;
  mergedKept?: number;
  note?: string;
};

export type SyncRecordRestorePlan = {
  items: SyncRecordMergePlanItem[];
  recordsToRestore: Partial<Record<SyncableStorageKey, string>>;
  restoreCount: number;
  remoteRestores: number;
  mergedRecords: number;
  keptLocalRecords: number;
  mergedAdded: number;
  mergedUpdated: number;
  mergedKept: number;
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

type JsonRecord = Record<string, unknown>;

type MergeRecordValueResult = {
  value: string;
  added: number;
  updated: number;
  kept: number;
  note: string;
};

const ARRAY_RECORD_KEYS = new Set<SyncableStorageKey>([
  "learn-english.materials.v1",
  "learn-english.learning-items.v1",
  "learn-english.review-cards.v1",
  "learn-english.review-logs.v1",
  "learn-english.activity-log.v1",
  "learn-english.practice-attempts.v1"
]);

const OBJECT_RECORD_KEYS = new Set<SyncableStorageKey>([
  "learn-english.ai-segment-explanations.v1"
]);

const TIMESTAMP_FIELDS_BY_KEY: Partial<Record<SyncableStorageKey, string[]>> = {
  "learn-english.materials.v1": ["updatedAt", "createdAt"],
  "learn-english.learning-items.v1": ["updatedAt", "createdAt"],
  "learn-english.review-cards.v1": ["updatedAt", "createdAt", "dueAt"],
  "learn-english.review-logs.v1": ["reviewedAt"],
  "learn-english.activity-log.v1": ["createdAt"],
  "learn-english.practice-attempts.v1": ["createdAt"]
};

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isJsonRecordWithId(value: unknown): value is JsonRecord & { id: string } {
  return isJsonRecord(value) && typeof value.id === "string" && value.id.length > 0;
}

function getRecordTimestampMs(key: SyncableStorageKey, record: JsonRecord) {
  const fields = TIMESTAMP_FIELDS_BY_KEY[key] ?? ["updatedAt", "createdAt"];

  for (const field of fields) {
    const value = record[field];

    if (typeof value === "string") {
      const timestamp = Date.parse(value);

      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }
  }

  return 0;
}

function sortObjectKeys(value: JsonRecord) {
  return Object.keys(value)
    .sort()
    .reduce<JsonRecord>((sorted, key) => {
      sorted[key] = value[key];
      return sorted;
    }, {});
}

function mergeArrayRecordValue(
  key: SyncableStorageKey,
  localValue: string,
  remoteValue: string
): MergeRecordValueResult | undefined {
  const localParsed = safeJsonParse(localValue);
  const remoteParsed = safeJsonParse(remoteValue);

  if (!Array.isArray(localParsed) || !Array.isArray(remoteParsed)) {
    return undefined;
  }

  if (![...localParsed, ...remoteParsed].every(isJsonRecordWithId)) {
    return undefined;
  }

  const merged = [...localParsed];
  const localIndexById = new Map(merged.map((record, index) => [record.id, index]));
  let added = 0;
  let updated = 0;
  let kept = 0;

  remoteParsed.forEach((remoteRecord) => {
    const localIndex = localIndexById.get(remoteRecord.id);

    if (localIndex === undefined) {
      merged.push(remoteRecord);
      localIndexById.set(remoteRecord.id, merged.length - 1);
      added += 1;
      return;
    }

    const localRecord = merged[localIndex];
    const localTimestamp = getRecordTimestampMs(key, localRecord);
    const remoteTimestamp = getRecordTimestampMs(key, remoteRecord);

    if (remoteTimestamp > localTimestamp) {
      merged[localIndex] = remoteRecord;
      updated += 1;
    } else {
      kept += 1;
    }
  });

  return {
    value: JSON.stringify(merged),
    added,
    updated,
    kept,
    note: "按记录 id 合并，冲突时保留更新时间更新的一条。"
  };
}

function mergeObjectRecordValue(
  localValue: string,
  remoteValue: string
): MergeRecordValueResult | undefined {
  const localParsed = safeJsonParse(localValue);
  const remoteParsed = safeJsonParse(remoteValue);

  if (!isJsonRecord(localParsed) || !isJsonRecord(remoteParsed)) {
    return undefined;
  }

  const merged: JsonRecord = { ...localParsed };
  let added = 0;
  const updated = 0;
  let kept = 0;

  Object.entries(remoteParsed).forEach(([key, remoteEntry]) => {
    if (!(key in merged)) {
      merged[key] = remoteEntry;
      added += 1;
      return;
    }

    if (JSON.stringify(merged[key]) !== JSON.stringify(remoteEntry)) {
      kept += 1;
      return;
    }

    kept += 1;
  });

  return {
    value: JSON.stringify(sortObjectKeys(merged)),
    added,
    updated,
    kept,
    note: "按缓存 key 合并，本地已有解释优先保留，云端新增解释补入。"
  };
}

function mergeSyncRecordValue(
  key: SyncableStorageKey,
  localValue: string | undefined,
  remoteValue: string | undefined
): MergeRecordValueResult | undefined {
  if (typeof localValue !== "string" || typeof remoteValue !== "string") {
    return undefined;
  }

  if (ARRAY_RECORD_KEYS.has(key)) {
    return mergeArrayRecordValue(key, localValue, remoteValue);
  }

  if (OBJECT_RECORD_KEYS.has(key)) {
    return mergeObjectRecordValue(localValue, remoteValue);
  }

  return undefined;
}

export function createSyncRestorePlan(
  localRecords: Partial<Record<SyncableStorageKey, string>>,
  remoteRecords: Partial<Record<SyncableStorageKey, string>>,
  localHashes: Partial<Record<SyncableStorageKey, string>>,
  remoteHashes: Partial<Record<SyncableStorageKey, string>>
): SyncRecordRestorePlan {
  const mergePlan = createSyncMergePlan(localHashes, remoteHashes);
  const recordsToRestore: Partial<Record<SyncableStorageKey, string>> = {};
  let remoteRestores = 0;
  let mergedRecords = 0;
  let keptLocalRecords = 0;
  let mergedAdded = 0;
  let mergedUpdated = 0;
  let mergedKept = 0;

  const items = mergePlan.map<SyncRecordMergePlanItem>((item) => {
    if (item.status === "same") {
      return {
        ...item,
        action: "none",
        willRestore: false,
        note: "本地和云端一致，无需处理。"
      };
    }

    if (item.status === "local-only") {
      return {
        ...item,
        action: "keep-local",
        willRestore: false,
        note: "仅本地存在，拉取时保留本地数据。"
      };
    }

    const remoteValue = remoteRecords[item.key];

    if (item.status === "remote-only") {
      if (typeof remoteValue === "string") {
        recordsToRestore[item.key] = remoteValue;
        remoteRestores += 1;
      }

      return {
        ...item,
        action: "restore-remote",
        willRestore: typeof remoteValue === "string",
        note: "仅云端存在，拉取时补充到本地。"
      };
    }

    const localValue = localRecords[item.key];
    const merged = mergeSyncRecordValue(item.key, localValue, remoteValue);

    if (merged) {
      const mergedHash = createStableRecordHash(merged.value);
      const localHash = typeof localValue === "string" ? createStableRecordHash(localValue) : "";
      const shouldRestore = mergedHash !== localHash;

      if (shouldRestore) {
        recordsToRestore[item.key] = merged.value;
        mergedRecords += 1;
      } else {
        keptLocalRecords += 1;
      }

      mergedAdded += merged.added;
      mergedUpdated += merged.updated;
      mergedKept += merged.kept;

      return {
        ...item,
        action: shouldRestore ? "merge-records" : "keep-local",
        willRestore: shouldRestore,
        mergedAdded: merged.added,
        mergedUpdated: merged.updated,
        mergedKept: merged.kept,
        note: shouldRestore ? merged.note : `${merged.note} 合并后本地数据无需变更。`
      };
    }

    if (typeof remoteValue === "string") {
      recordsToRestore[item.key] = remoteValue;
      remoteRestores += 1;
    }

    return {
      ...item,
      action: "restore-remote",
      willRestore: typeof remoteValue === "string",
      note: "该数据暂不支持细粒度合并，按云端版本恢复。"
    };
  });

  return {
    items,
    recordsToRestore,
    restoreCount: Object.keys(recordsToRestore).length,
    remoteRestores,
    mergedRecords,
    keptLocalRecords,
    mergedAdded,
    mergedUpdated,
    mergedKept
  };
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
