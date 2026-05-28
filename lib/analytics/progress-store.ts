"use client";

export type StudyActivityType = "input" | "output" | "review" | "ai" | "asset";

export type StudyActivityRecord = {
  id: string;
  type: StudyActivityType;
  label: string;
  minutes: number;
  materialId?: string;
  materialTitle?: string;
  createdAt: string;
};

export type WeeklyActivityDay = {
  day: string;
  input: number;
  output: number;
  review: number;
};

export type ActivitySummary = {
  inputMinutes: number;
  outputMinutes: number;
  reviewMinutes: number;
  aiEvents: number;
  assetEvents: number;
  reviewEvents: number;
  outputEvents: number;
  weeklyTimeline: WeeklyActivityDay[];
};

const ACTIVITY_LOG_KEY = "learn-english.activity-log.v1";
const MAX_ACTIVITY_LOGS = 500;
const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadStudyActivities() {
  return readJson<StudyActivityRecord[]>(ACTIVITY_LOG_KEY, []);
}

export function saveStudyActivities(records: StudyActivityRecord[]) {
  writeJson(ACTIVITY_LOG_KEY, records.slice(0, MAX_ACTIVITY_LOGS));
}

export function recordStudyActivity(input: {
  type: StudyActivityType;
  label: string;
  minutes?: number;
  materialId?: string;
  materialTitle?: string;
  createdAt?: string;
}) {
  const createdAt = input.createdAt ?? nowIso();
  const record: StudyActivityRecord = {
    id: `activity-${Date.parse(createdAt)}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    label: input.label,
    minutes: Math.max(0, input.minutes ?? 0),
    materialId: input.materialId,
    materialTitle: input.materialTitle,
    createdAt
  };

  saveStudyActivities([record, ...loadStudyActivities()]);
  return record;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return startOfLocalDay(date).toISOString().slice(0, 10);
}

function getWeekStart(referenceDate: Date) {
  const start = startOfLocalDay(referenceDate);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(start, mondayOffset);
}

export function summarizeStudyActivities(
  records = loadStudyActivities(),
  referenceDate = new Date()
): ActivitySummary {
  const weekStart = getWeekStart(referenceDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const timeline = days.map((day) => ({
    day: DAY_LABELS[day.getDay()],
    input: 0,
    output: 0,
    review: 0
  }));
  const indexByDateKey = new Map(days.map((day, index) => [dateKey(day), index]));
  let aiEvents = 0;
  let assetEvents = 0;
  let reviewEvents = 0;
  let outputEvents = 0;

  records.forEach((record) => {
    const date = new Date(record.createdAt);
    const index = indexByDateKey.get(dateKey(date));

    if (index === undefined) {
      return;
    }

    if (record.type === "input" || record.type === "ai") {
      timeline[index].input += record.minutes;
    }

    if (record.type === "output") {
      timeline[index].output += record.minutes;
      outputEvents += 1;
    }

    if (record.type === "review") {
      timeline[index].review += record.minutes;
      reviewEvents += 1;
    }

    if (record.type === "ai") {
      aiEvents += 1;
    }

    if (record.type === "asset") {
      assetEvents += 1;
    }
  });

  return {
    inputMinutes: timeline.reduce((sum, day) => sum + day.input, 0),
    outputMinutes: timeline.reduce((sum, day) => sum + day.output, 0),
    reviewMinutes: timeline.reduce((sum, day) => sum + day.review, 0),
    aiEvents,
    assetEvents,
    reviewEvents,
    outputEvents,
    weeklyTimeline: timeline
  };
}
