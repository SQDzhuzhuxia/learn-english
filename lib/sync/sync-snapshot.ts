export const SYNC_SCHEMA_VERSION = 1;

export const SYNCABLE_LOCAL_STORAGE_KEYS = [
  "learn-english.materials.v1",
  "learn-english.current-material-id.v1",
  "learn-english.learning-items.v1",
  "learn-english.review-cards.v1",
  "learn-english.review-logs.v1",
  "learn-english.activity-log.v1",
  "learn-english.practice-attempts.v1",
  "learn-english.ai-result-inbox.v1",
  "learn-english.ai-segment-explanations.v1"
] as const;

export type SyncableStorageKey = (typeof SYNCABLE_LOCAL_STORAGE_KEYS)[number];

export type SyncSnapshotRecord = {
  key: SyncableStorageKey;
  value: string;
  hash: string;
  sizeBytes: number;
};

export type SyncSnapshotPayload = {
  app: "learn-english";
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  deviceId: string;
  exportedAt: string;
  records: SyncSnapshotRecord[];
};

export function isSyncableStorageKey(key: string): key is SyncableStorageKey {
  return SYNCABLE_LOCAL_STORAGE_KEYS.includes(key as SyncableStorageKey);
}

export function createStableRecordHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function measureTextBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return value.length;
}

export function createSyncSnapshotFromRecords(
  records: Record<string, string>,
  options: {
    deviceId: string;
    exportedAt?: string;
  }
): SyncSnapshotPayload {
  return {
    app: "learn-english",
    schemaVersion: SYNC_SCHEMA_VERSION,
    deviceId: options.deviceId,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    records: Object.entries(records)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, value]) =>
        isSyncableStorageKey(key)
          ? [
              {
                key,
                value,
                hash: createStableRecordHash(value),
                sizeBytes: measureTextBytes(value)
              }
            ]
          : []
      )
  };
}

export function summarizeSyncSnapshot(snapshot: SyncSnapshotPayload) {
  return {
    recordCount: snapshot.records.length,
    totalBytes: snapshot.records.reduce((sum, record) => sum + record.sizeBytes, 0),
    hashes: snapshot.records.reduce<Partial<Record<SyncableStorageKey, string>>>((hashes, record) => {
      hashes[record.key] = record.hash;
      return hashes;
    }, {})
  };
}
