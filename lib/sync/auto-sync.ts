"use client";

import { createStableRecordHash, summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import type { SyncSnapshotPayload } from "@/lib/sync/sync-snapshot";

const AUTO_SYNC_ENABLED_KEY = "learn-english.auto-sync.enabled.v1";
const AUTO_SYNC_LAST_HASH_KEY = "learn-english.auto-sync.last-hash.v1";
const AUTO_SYNC_LAST_AT_KEY = "learn-english.auto-sync.last-at.v1";

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

export function saveAutoSyncUploadState(fingerprint: string, uploadedAt = new Date().toISOString()) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTO_SYNC_LAST_HASH_KEY, fingerprint);
  window.localStorage.setItem(AUTO_SYNC_LAST_AT_KEY, uploadedAt);
}

export function shouldUploadSyncSnapshot(fingerprint: string) {
  return fingerprint.length > 0 && fingerprint !== loadLastAutoSyncHash();
}
