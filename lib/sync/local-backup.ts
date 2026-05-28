"use client";

import { createSyncSnapshotFromRecords, isSyncableStorageKey } from "@/lib/sync/sync-snapshot";
import type { SyncSnapshotPayload, SyncableStorageKey } from "@/lib/sync/sync-snapshot";

export type LocalBackupPayload = {
  app: "learn-english";
  version: 1;
  exportedAt: string;
  records: Record<string, string>;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function createLocalBackup(): LocalBackupPayload {
  const records: Record<string, string> = {};

  if (canUseStorage()) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key?.startsWith("learn-english.")) {
        const value = window.localStorage.getItem(key);

        if (value !== null) {
          records[key] = value;
        }
      }
    }
  }

  return {
    app: "learn-english",
    version: 1,
    exportedAt: new Date().toISOString(),
    records
  };
}

export function createLocalSyncSnapshot(deviceId = "local-browser"): SyncSnapshotPayload {
  return createSyncSnapshotFromRecords(createLocalBackup().records, {
    deviceId
  });
}

export function parseLocalBackup(raw: string): LocalBackupPayload {
  const parsed = JSON.parse(raw) as LocalBackupPayload;

  if (parsed.app !== "learn-english" || parsed.version !== 1 || !parsed.records) {
    throw new Error("备份文件格式不正确。");
  }

  return parsed;
}

export function restoreLocalBackup(payload: LocalBackupPayload) {
  if (!canUseStorage()) {
    return 0;
  }

  const entries = Object.entries(payload.records).filter(([key]) => key.startsWith("learn-english."));

  entries.forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });

  return entries.length;
}

export function restoreSyncRecords(records: Partial<Record<SyncableStorageKey, string>>) {
  if (!canUseStorage()) {
    return 0;
  }

  const entries = Object.entries(records).filter(
    (entry): entry is [SyncableStorageKey, string] =>
      isSyncableStorageKey(entry[0]) && typeof entry[1] === "string"
  );

  entries.forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });

  return entries.length;
}
