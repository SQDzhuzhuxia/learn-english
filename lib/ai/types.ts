export type AiExplanationSource = "model" | "fallback";

export type AiSegmentExpression = {
  text: string;
  meaningZh: string;
  example: string;
};

export type AiSegmentExplanation = {
  sentence: string;
  meaningZh: string;
  structure: string[];
  keyExpressions: AiSegmentExpression[];
  commonMistake: string;
  shadowingTip: string;
  source: AiExplanationSource;
  provider: string;
  generatedAt: string;
};

export type ExplainSegmentInput = {
  materialTitle: string;
  materialType: string;
  level: string;
  sentence: string;
  contextText?: string;
};

export type ExplainMaterialSegmentInput = {
  id: string;
  order: number;
  text: string;
};

export type ExplainMaterialInput = {
  materialTitle: string;
  materialType: string;
  level: string;
  segments: ExplainMaterialSegmentInput[];
  contextText?: string;
};

export type AiMaterialSegmentExplanation = {
  segmentId: string;
  order: number;
  explanation: AiSegmentExplanation;
};

export type AiMaterialExplanation = {
  materialTitle: string;
  summaryZh: string;
  levelNote: string;
  segments: AiMaterialSegmentExplanation[];
  keyExpressions: AiSegmentExpression[];
  source: AiExplanationSource;
  provider: string;
  generatedAt: string;
};
