import type { MaterialSegment } from "@/lib/content/types";

const sentenceBoundary = /(?<=[.!?。！？])\s+/g;

export function splitTextIntoSegments(text: string): MaterialSegment[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(sentenceBoundary)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, index) => ({
      id: `s${index + 1}`,
      order: index + 1,
      text: segment,
      familiarity: index === 0 ? "重点" : "模糊"
    }));
}

export function estimateReadingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 85));
}
