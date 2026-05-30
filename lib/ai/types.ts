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

export type CorrectWritingInput = {
  promptTitle: string;
  prompt: string;
  level: string;
  userText: string;
};

export type AiWritingCorrection = {
  originalText: string;
  correctedText: string;
  feedbackZh: string;
  keyProblems: string[];
  betterExpressions: AiSegmentExpression[];
  source: AiExplanationSource;
  provider: string;
  generatedAt: string;
};

export type RoleplayTranscriptTurn = {
  speaker: "partner" | "learner";
  text: string;
};

export type GenerateRoleplayTurnInput = {
  scenarioTitle: string;
  setting: string;
  goal: string;
  level: string;
  partnerRole: string;
  learnerRole: string;
  transcript: RoleplayTranscriptTurn[];
};

export type AiRoleplayTurn = {
  partnerLine: string;
  translationZh: string;
  userGoalZh: string;
  suggestedReplies: string[];
  source: AiExplanationSource;
  provider: string;
  generatedAt: string;
};
