"use client";

import { useEffect, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CloudSyncClient } from "@/lib/sync/cloud-sync";
import { uploadSyncSnapshot } from "@/lib/sync/cloud-sync";
import {
  createSyncSnapshotFingerprint,
  loadAutoSyncPreference,
  saveAutoSyncUploadState,
  shouldUploadSyncSnapshot
} from "@/lib/sync/auto-sync";
import { createLocalSyncSnapshot } from "@/lib/sync/local-backup";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function isOnline() {
  return typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" || navigator.onLine;
}

export function CloudAutoSync() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let cancelled = false;
    let syncing = false;

    async function uploadChangedSnapshot() {
      if (cancelled || syncing || !loadAutoSyncPreference() || !isOnline()) {
        return;
      }

      syncing = true;

      try {
        const { data, error } = await client.auth.getUser();

        if (error || !data.user) {
          return;
        }

        const snapshot = createLocalSyncSnapshot("browser-auto");
        const fingerprint = createSyncSnapshotFingerprint(snapshot);

        if (!shouldUploadSyncSnapshot(fingerprint)) {
          return;
        }

        await uploadSyncSnapshot(client as unknown as CloudSyncClient, data.user.id, snapshot);
        saveAutoSyncUploadState(fingerprint);
      } catch {
        // Auto sync should never interrupt local learning.
      } finally {
        syncing = false;
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        void uploadChangedSnapshot();
      }
    }

    window.addEventListener("online", uploadChangedSnapshot);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(uploadChangedSnapshot, AUTO_SYNC_INTERVAL_MS);
    void uploadChangedSnapshot();

    return () => {
      cancelled = true;
      window.removeEventListener("online", uploadChangedSnapshot);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [supabase]);

  return null;
}
