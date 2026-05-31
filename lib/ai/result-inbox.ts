"use client";

import type { AiRequestQueueKind } from "@/lib/ai/request-queue";

export type AiResultInboxKind = Extract<AiRequestQueueKind, "correct-writing" | "roleplay-next">;

export type AiResultInboxRecord = {
  id: string;
  requestId: string;
  kind: AiResultInboxKind;
  title: string;
  summary: string;
  endpoint: string;
  requestPayload: unknown;
  resultPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

const AI_RESULT_INBOX_KEY = "learn-english.ai-result-inbox.v1";
const MAX_AI_RESULT_INBOX_SIZE = 100;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
}

function notifyInboxUpdated() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    const event =
      typeof CustomEvent === "function"
        ? new CustomEvent("learn-english:ai-result-inbox-updated")
        : new Event("learn-english:ai-result-inbox-updated");
    window.dispatchEvent(event);
  }
}

export function loadAiResultInbox() {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(AI_RESULT_INBOX_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as AiResultInboxRecord[];
  } catch {
    window.localStorage.removeItem(AI_RESULT_INBOX_KEY);
    return [];
  }
}

export function saveAiResultInbox(records: AiResultInboxRecord[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    AI_RESULT_INBOX_KEY,
    JSON.stringify(records.slice(0, MAX_AI_RESULT_INBOX_SIZE))
  );
  notifyInboxUpdated();
}

export function addAiResultInboxItem(input: {
  requestId: string;
  kind: AiResultInboxKind;
  title: string;
  summary: string;
  endpoint: string;
  requestPayload: unknown;
  resultPayload: unknown;
}) {
  const timestamp = nowIso();
  const records = loadAiResultInbox();
  const existing = records.find((record) => record.requestId === input.requestId);

  if (existing) {
    const updated: AiResultInboxRecord = {
      ...existing,
      title: input.title,
      summary: input.summary,
      resultPayload: input.resultPayload,
      updatedAt: timestamp
    };

    saveAiResultInbox([updated, ...records.filter((record) => record.id !== existing.id)]);
    return updated;
  }

  const record: AiResultInboxRecord = {
    id: `ai-result-${Date.parse(timestamp)}-${Math.random().toString(36).slice(2, 8)}`,
    requestId: input.requestId,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    endpoint: input.endpoint,
    requestPayload: input.requestPayload,
    resultPayload: input.resultPayload,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  saveAiResultInbox([record, ...records]);
  return record;
}

export function deleteAiResultInboxItem(id: string) {
  const records = loadAiResultInbox();
  const nextRecords = records.filter((record) => record.id !== id);
  saveAiResultInbox(nextRecords);
  return records.length - nextRecords.length;
}

export function clearAiResultInbox() {
  if (!canUseStorage()) {
    return 0;
  }

  const count = loadAiResultInbox().length;
  window.localStorage.removeItem(AI_RESULT_INBOX_KEY);
  notifyInboxUpdated();
  return count;
}
