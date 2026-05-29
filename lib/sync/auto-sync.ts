"use client";

import { createStableRecordHash, summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import type { SyncSnapshotPayload } from "@/lib/sync/sync-snapshot";

const AUTO_SYNC_ENABLED_KEY = "learn-english.auto-sync.enabled.v1";
const AUTO_SYNC_LAST_HASH_KEY = "learn-english.auto-sync.last-hash.v1";
const AUTO_SYNC_LAST_AT_KEY = "learn-english.auto-sync.last-at.v1";
const CLOUD_SYNC_LAST_EVENT_KEY = "learn-english.cloud-sync.last-event.v1";

export type AutoSyncUploadState = {
  fingerprint: string;
  uploadedAt: string;
};

export type CloudSyncLastEvent = {
  type: "manual-upload" | "auto-upload" | "download" | "check";
  message: string;
  occurredAt: string;
  recordCount?: number;
  totalBytes?: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadAutoSyncPreference() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(AUTO_SYNC_ENABLED_KEY) === "true";
}

export function saveAutoSyncPreference(enabled: boolean) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? "true" : "false");
}

export function createSyncSnapshotFingerprint(snapshot: SyncSnapshotPayload) {
  const summary = summarizeSyncSnapshot(snapshot);
  const stablePayload = Object.entries(summary.hashes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, hash]) => `${key}:${hash}`)
    .join("|");

  return createStableRecordHash(stablePayload);
}

export function loadLastAutoSyncHash() {
  if (!canUseStorage()) {
    return "";
  }

  return window.localStorage.getItem(AUTO_SYNC_LAST_HASH_KEY) ?? "";
}

export function loadAutoSyncUploadState(): AutoSyncUploadState | null {
  if (!canUseStorage()) {
    return null;
  }

  const fingerprint = window.localStorage.getItem(AUTO_SYNC_LAST_HASH_KEY) ?? "";
  const uploadedAt = window.localStorage.getItem(AUTO_SYNC_LAST_AT_KEY) ?? "";

  if (!fingerprint || !uploadedAt) {
    return null;
  }

  return {
    fingerprint,
    uploadedAt
  };
}

export function saveAutoSyncUploadState(fingerprint: string, uploadedAt = new Date().toISOString()) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTO_SYNC_LAST_HASH_KEY, fingerprint);
  window.localStorage.setItem(AUTO_SYNC_LAST_AT_KEY, uploadedAt);
}

export function loadCloudSyncLastEvent(): CloudSyncLastEvent | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(CLOUD_SYNC_LAST_EVENT_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CloudSyncLastEvent;
  } catch {
    window.localStorage.removeItem(CLOUD_SYNC_LAST_EVENT_KEY);
    return null;
  }
}

export function saveCloudSyncLastEvent(event: CloudSyncLastEvent) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(CLOUD_SYNC_LAST_EVENT_KEY, JSON.stringify(event));
}

export function shouldUploadSyncSnapshot(fingerprint: string) {
  return fingerprint.length > 0 && fingerprint !== loadLastAutoSyncHash();
}
