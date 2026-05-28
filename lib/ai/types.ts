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
