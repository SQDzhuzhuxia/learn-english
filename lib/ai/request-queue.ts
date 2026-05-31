"use client";

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
  fingerprint: string;
  status: AiRequestQueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

const AI_REQUEST_QUEUE_KEY = "learn-english.ai-request-queue.v1";
const MAX_AI_REQUEST_QUEUE_SIZE = 100;

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
}) {
  return createStableHash(`${input.endpoint}:${stableStringify(input.payload)}`);
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

export async function requestAiJsonWithQueue<T>(input: {
  kind: AiRequestQueueKind;
  endpoint: string;
  payload: unknown;
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
      error: message
    });

    return {
      queued: true,
      queueItem,
      error: message
    };
  }
}
