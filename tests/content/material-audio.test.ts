import { describe, expect, it } from "vitest";
import {
  createEstimatedAudioCues,
  createMaterialAudioAsset,
  formatMsAsTimestamp,
  parseMaterialAudioCues
} from "@/lib/content/material-audio";
import type { MaterialSegment } from "@/lib/content/types";

const segments: MaterialSegment[] = [
  {
    id: "s1",
    order: 1,
    text: "I would like to make an appointment.",
    familiarity: "重点"
  },
  {
    id: "s2",
    order: 2,
    text: "Do you have any openings this afternoon?",
    familiarity: "模糊"
  }
];

describe("material audio", () => {
  it("parses cue text by segment order or id", () => {
    const cues = parseMaterialAudioCues("1,0:00,0:03.5\ns2 3500 7200", segments);

    expect(cues).toEqual([
      {
        segmentId: "s1",
        order: 1,
        startMs: 0,
        endMs: 3500
      },
      {
        segmentId: "s2",
        order: 2,
        startMs: 3500,
        endMs: 7200
      }
    ]);
  });

  it("creates estimated cues when explicit cues are missing", () => {
    const asset = createMaterialAudioAsset({
      audioUrl: "https://example.com/audio.mp3",
      segments
    });

    expect(asset?.url).toBe("https://example.com/audio.mp3");
    expect(asset?.cues).toHaveLength(2);
    expect(asset?.cues[0]?.startMs).toBe(0);
    expect(asset?.cues[1]?.startMs).toBeGreaterThan(asset?.cues[0]?.endMs ?? 0);
  });

  it("formats timestamps for cue previews", () => {
    const cues = createEstimatedAudioCues(segments);

    expect(formatMsAsTimestamp(cues[0].startMs)).toBe("0:00");
    expect(formatMsAsTimestamp(65000)).toBe("1:05");
  });
});
