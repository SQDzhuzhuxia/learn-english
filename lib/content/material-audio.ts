import type { MaterialAudioAsset, MaterialAudioCue, MaterialSegment } from "@/lib/content/types";

export type MaterialAudioInput = {
  audioUrl?: string;
  audioCueText?: string;
  segments: MaterialSegment[];
  label?: string;
};

function parseTimeToMs(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? Math.round(numeric < 1000 ? numeric * 1000 : numeric) : undefined;
  }

  const parts = normalized.split(":").map(Number);

  if (parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.round((minutes * 60 + seconds) * 1000);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  return undefined;
}

export function formatMsAsTimestamp(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function splitCueLine(line: string) {
  return line
    .trim()
    .split(/[,\t ]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseMaterialAudioCues(
  cueText: string,
  segments: MaterialSegment[]
): MaterialAudioCue[] {
  const segmentByOrder = new Map(segments.map((segment) => [String(segment.order), segment]));
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));

  return cueText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [segmentRef, startRaw, endRaw] = splitCueLine(line);
      const segment = segmentById.get(segmentRef) ?? segmentByOrder.get(segmentRef);
      const startMs = parseTimeToMs(startRaw ?? "");
      const endMs = parseTimeToMs(endRaw ?? "");

      if (!segment || startMs === undefined || endMs === undefined || endMs <= startMs) {
        return undefined;
      }

      return {
        segmentId: segment.id,
        order: segment.order,
        startMs,
        endMs
      } satisfies MaterialAudioCue;
    })
    .filter((cue): cue is MaterialAudioCue => Boolean(cue));
}

export function createEstimatedAudioCues(segments: MaterialSegment[]): MaterialAudioCue[] {
  let cursor = 0;

  return segments.map((segment) => {
    const wordCount = segment.text.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(1600, wordCount * 520 + 700);
    const cue = {
      segmentId: segment.id,
      order: segment.order,
      startMs: cursor,
      endMs: cursor + duration
    };

    cursor = cue.endMs + 450;
    return cue;
  });
}

export function createMaterialAudioAsset(input: MaterialAudioInput): MaterialAudioAsset | undefined {
  const url = input.audioUrl?.trim();

  if (!url) {
    return undefined;
  }

  const explicitCues = input.audioCueText
    ? parseMaterialAudioCues(input.audioCueText, input.segments)
    : [];
  const cues = explicitCues.length > 0 ? explicitCues : createEstimatedAudioCues(input.segments);

  return {
    source: "material",
    url,
    label: input.label?.trim() || "Material audio",
    cues
  };
}

export function createAudioCueText(cues: MaterialAudioCue[] | undefined) {
  return (cues ?? [])
    .map((cue) => `${cue.order},${formatMsAsTimestamp(cue.startMs)},${formatMsAsTimestamp(cue.endMs)}`)
    .join("\n");
}

export function getAudioCueForOrder(audio: MaterialAudioAsset | undefined, order: number) {
  return audio?.cues.find((cue) => cue.order === order);
}
