import type { AiSegmentExplanation, ExplainSegmentInput } from "@/lib/ai/types";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "is",
  "are",
  "am",
  "be",
  "been",
  "being",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their"
]);

function uniqueUsefulWords(sentence: string) {
  const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const seen = new Set<string>();

  return words
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .filter((word) => {
      if (seen.has(word)) {
        return false;
      }

      seen.add(word);
      return true;
    });
}

export function createFallbackSegmentExplanation(
  input: ExplainSegmentInput,
  reason = "AI provider is not configured"
): AiSegmentExplanation {
  const sentence = input.sentence.trim();
  const usefulWords = uniqueUsefulWords(sentence).slice(0, 3);
  const fallbackExpressions = usefulWords.length > 0 ? usefulWords : [sentence.split(/\s+/).slice(0, 4).join(" ")];

  return {
    sentence,
    meaningZh: `本地降级解释：这句话来自《${input.materialTitle}》，请先结合上下文理解大意，再重点观察里面可以直接复用的表达。`,
    structure: [
      "先找主语和核心动作，不要一开始就逐词翻译。",
      "把这句话当作一个完整表达来听读，优先掌握它在真实场景里的用途。",
      `当前材料难度是 ${input.level || "未标注"}，适合先做到听懂大意，再逐步跟读。`
    ],
    keyExpressions: fallbackExpressions.map((text) => ({
      text,
      meaningZh: "待模型精确解释；现在先作为重点表达保存和复习。",
      example: sentence
    })),
    commonMistake: "中文母语者容易把这类句子按中文语序逐词拼出来。更好的方式是整句输入、整句模仿、整句复用。",
    shadowingTip: "跟读时先慢速读完整句，再模仿重音和停顿。初期目标是清楚、完整、稳定，不追求速度。",
    source: "fallback",
    provider: reason,
    generatedAt: new Date().toISOString()
  };
}
