import { createPronunciationFocus, type PronunciationFocus } from "@/lib/speech/pronunciation-focus";

export type ShadowingFeedback = {
  score: number;
  completeness: number;
  matchedWords: number;
  totalWords: number;
  missingWords: string[];
  extraWords: string[];
  focusWords: string[];
  pronunciationFocus: PronunciationFocus[];
  suggestions: string[];
  label: string;
  tip: string;
};

function normalizeWords(text: string) {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter(Boolean);
}

function uniqueFirst(words: string[], limit = 6) {
  return words.filter((word, index) => words.indexOf(word) === index).slice(0, limit);
}

function createMatchedIndexes(targetWords: string[], spokenWords: string[]) {
  const rows = targetWords.length + 1;
  const columns = spokenWords.length + 1;
  const table = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      table[row][column] =
        targetWords[row - 1] === spokenWords[column - 1]
          ? table[row - 1][column - 1] + 1
          : Math.max(table[row - 1][column], table[row][column - 1]);
    }
  }

  const targetIndexes = new Set<number>();
  const spokenIndexes = new Set<number>();
  let row = targetWords.length;
  let column = spokenWords.length;

  while (row > 0 && column > 0) {
    if (targetWords[row - 1] === spokenWords[column - 1]) {
      targetIndexes.add(row - 1);
      spokenIndexes.add(column - 1);
      row -= 1;
      column -= 1;
    } else if (table[row - 1][column] >= table[row][column - 1]) {
      row -= 1;
    } else {
      column -= 1;
    }
  }

  return {
    targetIndexes,
    spokenIndexes
  };
}

function findPronunciationFocus(targetWords: string[], missingWords: string[]) {
  const riskWords = targetWords.filter(
    (word) => word.length >= 7 || /th|r|l|v|w/.test(word) || word.endsWith("ed")
  );

  return uniqueFirst([...missingWords, ...riskWords], 6);
}

function createSuggestions(input: {
  score: number;
  missingWords: string[];
  extraWords: string[];
  focusWords: string[];
}) {
  const suggestions: string[] = [];

  if (input.missingWords.length > 0) {
    suggestions.push(`补齐漏掉的词：${input.missingWords.slice(0, 4).join(", ")}。`);
  }

  if (input.extraWords.length > 0) {
    suggestions.push(`减少多余或被误识别的词：${input.extraWords.slice(0, 4).join(", ")}。`);
  }

  if (input.focusWords.length > 0) {
    suggestions.push(`重点慢读这些词：${input.focusWords.slice(0, 4).join(", ")}。`);
  }

  if (input.score < 60) {
    suggestions.push("把原句切成两小段，先慢速跟读，再合成一句。");
  } else if (input.score < 85) {
    suggestions.push("下一遍先保证完整，再模仿重音和停顿。");
  } else {
    suggestions.push("完整度不错，下一步练连读、弱读和自然停顿。");
  }

  return suggestions;
}

export function createShadowingFeedback(prompt: string, transcript: string): ShadowingFeedback {
  const targetWords = normalizeWords(prompt);
  const spokenWords = normalizeWords(transcript);
  const matchedIndexes = createMatchedIndexes(targetWords, spokenWords);

  const matchedWords = matchedIndexes.targetIndexes.size;
  const totalWords = Math.max(1, targetWords.length);
  const completeness = Math.round((matchedWords / totalWords) * 100);
  const missingWords = targetWords
    .filter((_, index) => !matchedIndexes.targetIndexes.has(index));
  const extraWords = spokenWords.filter((_, index) => !matchedIndexes.spokenIndexes.has(index));
  const extraPenalty = Math.min(20, Math.round((extraWords.length / Math.max(1, spokenWords.length)) * 30));
  const score = Math.max(0, Math.min(100, completeness - extraPenalty));
  const uniqueMissingWords = uniqueFirst(missingWords);
  const uniqueExtraWords = uniqueFirst(extraWords);
  const focusWords = findPronunciationFocus(targetWords, uniqueMissingWords);
  const pronunciationFocus = createPronunciationFocus(focusWords.length > 0 ? focusWords : targetWords);
  const suggestions = createSuggestions({
    score,
    missingWords: uniqueMissingWords,
    extraWords: uniqueExtraWords,
    focusWords
  });

  if (score >= 85) {
    return {
      score,
      completeness,
      matchedWords,
      totalWords,
      missingWords: uniqueMissingWords,
      extraWords: uniqueExtraWords,
      focusWords,
      pronunciationFocus,
      suggestions,
      label: "很接近",
      tip: "这一遍已经比较完整，可以继续模仿语调、弱读和连读。"
    };
  }

  if (score >= 60) {
    return {
      score,
      completeness,
      matchedWords,
      totalWords,
      missingWords: uniqueMissingWords,
      extraWords: uniqueExtraWords,
      focusWords,
      pronunciationFocus,
      suggestions,
      label: "基本说出",
      tip: "先补齐漏掉的词，再慢速跟读一遍。"
    };
  }

  return {
    score,
    completeness,
    matchedWords,
    totalWords,
    missingWords: uniqueMissingWords,
    extraWords: uniqueExtraWords,
    focusWords,
    pronunciationFocus,
    suggestions,
    label: "需要慢速重来",
    tip: "先听原句，再分成两小段跟读。"
  };
}
