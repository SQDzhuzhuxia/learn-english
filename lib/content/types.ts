export type MaterialSource = "seed" | "user";

export type MaterialSegment = {
  id: string;
  order: number;
  text: string;
  translation?: string;
  note?: string;
  familiarity: "认识" | "模糊" | "不认识" | "重点";
};

export type MaterialAudioCue = {
  segmentId: string;
  order: number;
  startMs: number;
  endMs: number;
};

export type MaterialAudioAsset = {
  source: "material";
  url: string;
  label: string;
  cues: MaterialAudioCue[];
};

export type StudyMaterialRecord = {
  id: string;
  title: string;
  type: string;
  level: string;
  minutes: number;
  status: "未开始" | "学习中" | "已完成";
  progress: number;
  knownRate: number;
  inputType: string;
  priority: string;
  summary: string;
  keyExpressions: string[];
  contentText: string;
  segments: MaterialSegment[];
  audio?: MaterialAudioAsset;
  source: MaterialSource;
  currentSegmentOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type NewTextMaterialInput = {
  title: string;
  type: string;
  level: string;
  contentText: string;
  audioUrl?: string;
  audioCueText?: string;
};
