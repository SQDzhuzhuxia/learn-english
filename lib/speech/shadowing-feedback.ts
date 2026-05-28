export type ShadowingFeedback = {
  score: number;
  matchedWords: number;
  totalWords: number;
  missingWords: string[];
  label: string;
  tip: string;
};

function normalizeWords(text: string) {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter(Boolean);
}

export function createShadowingFeedback(prompt: string, transcript: string): ShadowingFeedback {
  const targetWords = normalizeWords(prompt);
  const spokenWords = normalizeWords(transcript);
  let cursor = 0;
  const matchedIndexes = new Set<number>();

  spokenWords.forEach((word) => {
    const nextIndex = targetWords.findIndex((targetWord, index) => index >= cursor && targetWord === word);

    if (nextIndex >= 0) {
      matchedIndexes.add(nextIndex);
      cursor = nextIndex + 1;
    }
  });

  const matchedWords = matchedIndexes.size;
  const totalWords = Math.max(1, targetWords.length);
  const score = Math.round((matchedWords / totalWords) * 100);
  const missingWords = targetWords
    .filter((_, index) => !matchedIndexes.has(index))
    .filter((word, index, words) => words.indexOf(word) === index)
    .slice(0, 6);

  if (score >= 85) {
    return {
      score,
      matchedWords,
      totalWords,
      missingWords,
      label: "很接近",
      tip: "这一遍已经比较完整，可以继续模仿语调和连读。"
    };
  }

  if (score >= 60) {
    return {
      score,
      matchedWords,
      totalWords,
      missingWords,
      label: "基本说出",
      tip: "先补齐漏掉的词，再慢速跟读一遍。"
    };
  }

  return {
    score,
    matchedWords,
    totalWords,
    missingWords,
    label: "需要慢速重来",
    tip: "先听原句，再分成两小段跟读。"
  };
}
