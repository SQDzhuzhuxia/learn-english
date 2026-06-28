import type { StudyMaterialRecord } from "@/lib/content/types";

export type MaterialShadowingPractice = {
  title: string;
  material: string;
  target: string;
  prompt: string;
  steps: string[];
};

export type MaterialRetellingKeyPoint = {
  label: string;
  keywords: string[];
};

export type MaterialRetellingPractice = {
  title: string;
  material: string;
  prompt: string;
  sourceSummary: string;
  keyPoints: MaterialRetellingKeyPoint[];
  usefulWords: string[];
  starters: string[];
};

export type MaterialWritingPrompt = {
  title: string;
  prompt: string;
  level: string;
};

export type MaterialRoleplayTurn = {
  id: string;
  partnerLine: string;
  translation: string;
  userGoalZh: string;
  expectedKeywords: string[];
  suggestedReplies: string[];
};

export type MaterialRoleplayScenario = {
  title: string;
  material: string;
  level: string;
  setting: string;
  learnerRole: string;
  partnerRole: string;
  goal: string;
  usefulExpressions: string[];
  turns: MaterialRoleplayTurn[];
};

export type MaterialPracticeDrill = {
  id: string;
  type: "shadowing" | "retelling" | "cloze" | "roleplay" | "writing";
  title: string;
  instruction: string;
  prompt: string;
  answerHints: string[];
  estimatedMinutes: number;
  href: string;
};

export type MaterialPracticeBundle = {
  materialId: string;
  shadowing: MaterialShadowingPractice;
  retelling: MaterialRetellingPractice;
  writingPrompts: MaterialWritingPrompt[];
  roleplay: MaterialRoleplayScenario;
  drills: MaterialPracticeDrill[];
};

function sentencesOf(material: StudyMaterialRecord): string[] {
  return material.segments.map((segment) => segment.text).filter(Boolean);
}

function focusFirstSentences(material: StudyMaterialRecord, count: number): string[] {
  const segments = [...material.segments].sort((a, b) => {
    const aWeight = a.familiarity === "重点" ? 0 : 1;
    const bWeight = b.familiarity === "重点" ? 0 : 1;

    if (aWeight !== bWeight) {
      return aWeight - bWeight;
    }

    return a.order - b.order;
  });

  return segments.slice(0, count).map((segment) => segment.text).filter(Boolean);
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "of",
  "and",
  "is",
  "are",
  "do",
  "you",
  "i",
  "it",
  "in",
  "on",
  "at",
  "for",
  "with",
  "my",
  "your"
]);

function contentWordsOf(text: string): string[] {
  return wordsOf(text).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function uniqueList(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(value);
    }

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function maskFirstUsefulChunk(sentence: string, expressions: string[]) {
  const expression = expressions.find((item) => sentence.toLowerCase().includes(item.toLowerCase()));

  if (expression) {
    return {
      prompt: sentence.replace(new RegExp(expression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "____"),
      answer: expression
    };
  }

  const word = contentWordsOf(sentence).find((item) => item.length >= 5);

  if (!word) {
    return {
      prompt: sentence,
      answer: ""
    };
  }

  return {
    prompt: sentence.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "____"),
    answer: word
  };
}

export function createShadowingPracticeFromMaterial(
  material: StudyMaterialRecord
): MaterialShadowingPractice {
  const focusSentences = focusFirstSentences(material, 3);
  const prompt = focusSentences[0] ?? sentencesOf(material)[0] ?? material.summary;

  return {
    title: `跟读：${material.title}`,
    material: material.title,
    target: `能把「${prompt}」说完整、说清楚。`,
    prompt,
    steps: ["先听原句 2 遍", "慢速跟读 3 遍", "录音 1 遍", "看转写结果，保存不熟的表达"]
  };
}

export function createRetellingPracticeFromMaterial(
  material: StudyMaterialRecord
): MaterialRetellingPractice {
  const sentences = sentencesOf(material);
  const starters = uniqueList(focusFirstSentences(material, 3), 3);
  const sourceSummary = sentences.slice(0, 3).join(" ") || material.summary;
  const keyExpressions = material.keyExpressions.filter(Boolean);
  const keyPoints: MaterialRetellingKeyPoint[] =
    keyExpressions.length > 0
      ? keyExpressions.slice(0, 3).map((expression) => ({
          label: expression,
          keywords: uniqueList(contentWordsOf(expression).length > 0 ? contentWordsOf(expression) : wordsOf(expression), 3)
        }))
      : sentences.slice(0, 3).map((sentence, index) => ({
          label: `要点 ${index + 1}`,
          keywords: uniqueList(contentWordsOf(sentence), 3)
        }));
  const usefulWords = uniqueList(
    [...keyExpressions.flatMap(contentWordsOf), ...sentences.flatMap(contentWordsOf)],
    8
  );

  return {
    title: `复述：${material.title}`,
    material: material.title,
    prompt: `用 2-3 句简单英文，复述 ${material.title} 的主要内容。`,
    sourceSummary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [{ label: "主要内容", keywords: uniqueList(contentWordsOf(material.summary), 3) }],
    usefulWords: usefulWords.length > 0 ? usefulWords : uniqueList(contentWordsOf(material.summary), 6),
    starters: starters.length > 0 ? starters : [material.summary]
  };
}

export function createWritingPromptsFromMaterial(
  material: StudyMaterialRecord
): MaterialWritingPrompt[] {
  const keyExpressions = material.keyExpressions.filter(Boolean);
  const prompts: MaterialWritingPrompt[] = [];

  keyExpressions.slice(0, 2).forEach((expression) => {
    prompts.push({
      title: `用「${expression}」造句`,
      prompt: `用英文写一句话，用上「${expression}」，场景围绕 ${material.title}。`,
      level: material.level
    });
  });

  prompts.push({
    title: `${material.title} 小结`,
    prompt: `用 1-2 句英文，写下你在 ${material.title} 里学到的最有用的一句话或一个请求。`,
    level: material.level
  });

  return prompts.slice(0, 3);
}

export function createRoleplayScenarioFromMaterial(
  material: StudyMaterialRecord
): MaterialRoleplayScenario {
  const focusSentences = focusFirstSentences(material, 3);
  const fallbackSentences = sentencesOf(material);
  const replyPool = (focusSentences.length > 0 ? focusSentences : fallbackSentences).filter(Boolean);
  const usefulExpressions = material.keyExpressions.filter(Boolean);
  const turnPlans = [
    {
      partnerLine: "Hello. How can I help you today?",
      translation: "你好，有什么可以帮你的？",
      userGoalZh: `说明你在「${material.title}」场景里想做什么。`
    },
    {
      partnerLine: "Okay. Could you tell me a bit more?",
      translation: "好的，可以再多说一点吗？",
      userGoalZh: "补充关键信息，把句子说完整。"
    },
    {
      partnerLine: "Got it. Is there anything else?",
      translation: "明白了，还有别的需要吗？",
      userGoalZh: "确认或礼貌收尾。"
    }
  ];

  const turns: MaterialRoleplayTurn[] = turnPlans
    .map((plan, index) => {
      const reply = replyPool[index] ?? replyPool[replyPool.length - 1] ?? material.summary;

      if (!reply) {
        return undefined;
      }

      return {
        id: `${material.id}-turn-${index + 1}`,
        partnerLine: plan.partnerLine,
        translation: plan.translation,
        userGoalZh: plan.userGoalZh,
        expectedKeywords: uniqueList(contentWordsOf(reply), 2),
        suggestedReplies: uniqueList([reply], 2)
      } satisfies MaterialRoleplayTurn;
    })
    .filter((turn): turn is MaterialRoleplayTurn => Boolean(turn));

  return {
    title: `场景口语：${material.title}`,
    material: material.title,
    level: material.level,
    setting: `${material.type} · ${material.title}`,
    learnerRole: `你在「${material.title}」场景里用英语完成任务。`,
    partnerRole: "AI 扮演场景里的对方，用简单英文一步步问你。",
    goal: `用学过的句子完成 ${material.title} 的主要任务。`,
    usefulExpressions: usefulExpressions.length > 0 ? usefulExpressions : uniqueList(replyPool, 3),
    turns:
      turns.length > 0
        ? turns
        : [
            {
              id: `${material.id}-turn-1`,
              partnerLine: "Hello. How can I help you today?",
              translation: "你好，有什么可以帮你的？",
              userGoalZh: `说明你在「${material.title}」场景里想做什么。`,
              expectedKeywords: uniqueList(contentWordsOf(material.summary), 2),
              suggestedReplies: [material.summary]
            }
          ]
  };
}

export function createMaterialPracticeDrills(material: StudyMaterialRecord): MaterialPracticeDrill[] {
  const focusSentences = focusFirstSentences(material, 4);
  const sentences = sentencesOf(material);
  const keyExpressions = material.keyExpressions.filter(Boolean);
  const sourceSentences = focusSentences.length > 0 ? focusSentences : sentences;
  const drills: MaterialPracticeDrill[] = [];

  sourceSentences.slice(0, 3).forEach((sentence, index) => {
    drills.push({
      id: `${material.id}-shadowing-${index + 1}`,
      type: "shadowing",
      title: `跟读关键句 ${index + 1}`,
      instruction: "先听一遍，再看句子完整跟读。",
      prompt: sentence,
      answerHints: uniqueList(contentWordsOf(sentence), 3),
      estimatedMinutes: 2,
      href: "/practice#practice-shadowing"
    });
  });

  drills.push({
    id: `${material.id}-retelling-main`,
    type: "retelling",
    title: "30 秒复述",
    instruction: `不看原文，用 2-3 句英文复述「${material.title}」。`,
    prompt: material.summary,
    answerHints: uniqueList(
      keyExpressions.length > 0 ? keyExpressions.flatMap(contentWordsOf) : sourceSentences.flatMap(contentWordsOf),
      5
    ),
    estimatedMinutes: 4,
    href: "/practice#practice-retelling"
  });

  sourceSentences.slice(0, 2).forEach((sentence, index) => {
    const masked = maskFirstUsefulChunk(sentence, keyExpressions);

    if (!masked.answer) {
      return;
    }

    drills.push({
      id: `${material.id}-cloze-${index + 1}`,
      type: "cloze",
      title: `场景填空 ${index + 1}`,
      instruction: "补出空格里的高频词块，再大声读完整句。",
      prompt: masked.prompt,
      answerHints: [masked.answer],
      estimatedMinutes: 2,
      href: `/study/${material.id}`
    });
  });

  if (keyExpressions[0]) {
    drills.push({
      id: `${material.id}-writing-expression`,
      type: "writing",
      title: "表达迁移写作",
      instruction: `换一个真实生活场景，用「${keyExpressions[0]}」写一句英文。`,
      prompt: keyExpressions[0],
      answerHints: keyExpressions.slice(0, 3),
      estimatedMinutes: 4,
      href: "/practice#practice-writing"
    });
  }

  drills.push({
    id: `${material.id}-roleplay-open`,
    type: "roleplay",
    title: "开放追问准备",
    instruction: "先准备一句开场请求，再进入角色扮演。",
    prompt: `I would like to talk about ${material.title}.`,
    answerHints: uniqueList(keyExpressions, 3),
    estimatedMinutes: 3,
    href: "/practice#practice-roleplay"
  });

  return drills.slice(0, 8);
}

export function createMaterialPracticeBundle(
  material: StudyMaterialRecord
): MaterialPracticeBundle {
  return {
    materialId: material.id,
    shadowing: createShadowingPracticeFromMaterial(material),
    retelling: createRetellingPracticeFromMaterial(material),
    writingPrompts: createWritingPromptsFromMaterial(material),
    roleplay: createRoleplayScenarioFromMaterial(material),
    drills: createMaterialPracticeDrills(material)
  };
}
