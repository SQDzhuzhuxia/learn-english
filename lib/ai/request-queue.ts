"use client";

import {
  setCachedAiExplanation,
  setCachedAiExplanations
} from "@/lib/ai/explanation-cache";
import type { AiMaterialExplanation, AiSegmentExplanation } from "@/lib/ai/types";

export type AiRequestQueueKind =
  | "explain-segment"
  | "explain-material"
  | "correct-writing"
  | "roleplay-next";

export type AiRequestQueueStatus = "queued" | "completed" | "failed";

export type AiRequestQueueRecord = {
  id: string;
  kind: AiRequestQueueKind;
  endpoint: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
  fingerprint: string;
  status: AiRequestQueueStatus;
  attempts: number;
  lastError?: string;
  lastResultSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiRequestRetrySummary = {
  attempted: number;
  completed: number;
  failed: number;
  skipped: number;
  remaining: number;
};

const AI_REQUEST_QUEUE_KEY = "learn-english.ai-request-queue.v1";
const MAX_AI_REQUEST_QUEUE_SIZE = 100;
const AUTO_RETRYABLE_KINDS = new Set<AiRequestQueueKind>([
  "explain-segment",
  "explain-material"
]);

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function createAiRequestFingerprint(input: {
  endpoint: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}) {
  return createStableHash(
    stableStringify({
      endpoint: input.endpoint,
      payload: input.payload,
      metadata: input.metadata ?? null
    })
  );
}

export function loadAiRequestQueue() {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(AI_REQUEST_QUEUE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AiRequestQueueRecord[];
    return parsed.filter((record) => record.status !== "completed");
  } catch {
    window.localStorage.removeItem(AI_REQUEST_QUEUE_KEY);
    return [];
  }
}

export function saveAiRequestQueue(records: AiRequestQueueRecord[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    AI_REQUEST_QUEUE_KEY,
    JSON.stringify(records.slice(0, MAX_AI_REQUEST_QUEUE_SIZE))
  );
}

export function enqueueAiRequest(input: {
  kind: AiRequestQueueKind;
  endpoint: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
  error?: string;
}) {
  const fingerprint = createAiRequestFingerprint(input);
  const timestamp = nowIso();
  const records = loadAiRequestQueue();
  const existing = records.find((record) => record.fingerprint === fingerprint);

  if (existing) {
    const updated = {
      ...existing,
      status: "queued" as const,
      attempts: existing.attempts + 1,
      lastError: input.error,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: timestamp
    };

    saveAiRequestQueue([updated, ...records.filter((record) => record.id !== existing.id)]);
    return updated;
  }

  const record: AiRequestQueueRecord = {
    id: `ai-request-${Date.parse(timestamp)}-${fingerprint}`,
    kind: input.kind,
    endpoint: input.endpoint,
    payload: input.payload,
    metadata: input.metadata,
    fingerprint,
    status: "queued",
    attempts: 1,
    lastError: input.error,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  saveAiRequestQueue([record, ...records]);
  return record;
}

export function clearAiRequestQueue() {
  if (!canUseStorage()) {
    return 0;
  }

  const count = loadAiRequestQueue().length;
  window.localStorage.removeItem(AI_REQUEST_QUEUE_KEY);
  return count;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRecordString(record: AiRequestQueueRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function canAutoRetryRecord(record: AiRequestQueueRecord) {
  if (!AUTO_RETRYABLE_KINDS.has(record.kind)) {
    return false;
  }

  if (record.kind === "explain-segment") {
    return Boolean(getRecordString(record, "cacheKey"));
  }

  if (record.kind === "explain-material") {
    return Boolean(getRecordString(record, "materialId"));
  }

  return false;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) {
    return fallback;
  }

  return typeof payload.error === "string" ? payload.error : fallback;
}

function getPayloadRecord(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("AI 返回结果格式不正确。");
  }

  return payload;
}

function applyAiRequestResult(record: AiRequestQueueRecord, payload: unknown) {
  if (record.kind === "explain-segment") {
    const cacheKey = getRecordString(record, "cacheKey");
    const payloadRecord = getPayloadRecord(payload);
    const explanation = payloadRecord.explanation as AiSegmentExplanation | undefined;

    if (!cacheKey) {
      throw new Error("缺少当前句解释缓存位置，无法自动回写。");
    }

    if (!explanation) {
      throw new Error(getErrorMessage(payload, "AI 当前句解释返回结果缺少 explanation。"));
    }

    setCachedAiExplanation(cacheKey, explanation);
    return `已回写当前句解释：${cacheKey}`;
  }

  if (record.kind === "explain-material") {
    const materialId = getRecordString(record, "materialId");
    const payloadRecord = getPayloadRecord(payload);
    const explanation = payloadRecord.explanation as AiMaterialExplanation | undefined;

    if (!materialId) {
      throw new Error("缺少整篇解释材料 ID，无法自动回写。");
    }

    if (!explanation?.segments?.length) {
      throw new Error(getErrorMessage(payload, "AI 整篇解释返回结果缺少 segments。"));
    }

    setCachedAiExplanations(
      explanation.segments.map((segment) => ({
        cacheKey: `${materialId}:${segment.segmentId}`,
        explanation: segment.explanation
      }))
    );
    return `已回写整篇解释 ${explanation.segments.length} 句。`;
  }

  return undefined;
}

function updateQueuedRecord(record: AiRequestQueueRecord) {
  const records = loadAiRequestQueue();
  saveAiRequestQueue(records.map((item) => (item.id === record.id ? record : item)));
}

function removeQueuedRecord(recordId: string) {
  saveAiRequestQueue(loadAiRequestQueue().filter((record) => record.id !== recordId));
}

export async function retryQueuedAiRequests(input?: {
  limit?: number;
  fetcher?: typeof fetch;
}): Promise<AiRequestRetrySummary> {
  const limit = input?.limit ?? 5;
  const fetcher = input?.fetcher ?? fetch;
  const candidates = loadAiRequestQueue();
  let attempted = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of candidates) {
    if (attempted >= limit) {
      break;
    }

    if (!canAutoRetryRecord(record)) {
      skipped += 1;
      continue;
    }

    attempted += 1;

    try {
      const response = await fetcher(record.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(record.payload)
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "AI 请求重试失败。"));
      }

      const lastResultSummary = applyAiRequestResult(record, payload);
      const updated: AiRequestQueueRecord = {
        ...record,
        status: "completed",
        attempts: record.attempts + 1,
        lastError: undefined,
        lastResultSummary,
        updatedAt: nowIso()
      };

      updateQueuedRecord(updated);
      removeQueuedRecord(record.id);
      completed += 1;
    } catch (error) {
      const updated: AiRequestQueueRecord = {
        ...record,
        status: "failed",
        attempts: record.attempts + 1,
        lastError: error instanceof Error ? error.message : "AI 请求重试失败。",
        updatedAt: nowIso()
      };

      updateQueuedRecord(updated);
      failed += 1;
    }
  }

  return {
    attempted,
    completed,
    failed,
    skipped,
    remaining: loadAiRequestQueue().length
  };
}

export async function requestAiJsonWithQueue<T>(input: {
  kind: AiRequestQueueKind;
  endpoint: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
  errorMessage: string;
}): Promise<
  | {
      queued: false;
      payload: T;
    }
  | {
      queued: true;
      queueItem: AiRequestQueueRecord;
      error: string;
    }
> {
  const runRequest = async () => {
    const response = await fetch(input.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input.payload)
    });
    const payload = (await response.json()) as T & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? input.errorMessage);
    }

    return payload;
  };

  try {
    const payload = await runRequest();
    return {
      queued: false,
      payload
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : input.errorMessage;
    const queueItem = enqueueAiRequest({
      kind: input.kind,
      endpoint: input.endpoint,
      payload: input.payload,
      metadata: input.metadata,
      error: message
    });

    return {
      queued: true,
      queueItem,
      error: message
    };
  }
}
