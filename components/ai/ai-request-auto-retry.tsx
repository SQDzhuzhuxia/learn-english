"use client";

import { useEffect, useRef } from "react";
import { retryQueuedAiRequests } from "@/lib/ai/request-queue";

const RETRY_INTERVAL_MS = 120_000;
const RETRY_LIMIT = 5;

export function AiRequestAutoRetry() {
  const isRetryingRef = useRef(false);

  useEffect(() => {
    async function runRetry() {
      if (isRetryingRef.current) {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      isRetryingRef.current = true;
      try {
        await retryQueuedAiRequests({ limit: RETRY_LIMIT });
      } finally {
        isRetryingRef.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void runRetry();
      }
    }

    window.addEventListener("online", runRetry);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(() => void runRetry(), RETRY_INTERVAL_MS);

    queueMicrotask(() => void runRetry());

    return () => {
      window.removeEventListener("online", runRetry);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
