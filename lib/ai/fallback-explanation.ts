import type {
  AiMaterialExplanation,
  AiGeneratedPracticeSet,
  AiGeneratedPracticeDrill,
  AiRoleplayTurn,
  AiSegmentExplanation,
  AiWritingCorrection,
  CorrectWritingInput,
  ExplainMaterialInput,
  ExplainSegmentInput,
  GeneratePracticeInput,
  GenerateRoleplayTurnInput
} from "@/lib/ai/types";

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

export function createFallbackMaterialExplanation(
  input: ExplainMaterialInput,
  reason = "AI provider is not configured"
): AiMaterialExplanation {
  const generatedAt = new Date().toISOString();
  const segments = input.segments.slice(0, 60).map((segment) => ({
    segmentId: segment.id,
    order: segment.order,
    explanation: {
      ...createFallbackSegmentExplanation(
        {
          materialTitle: input.materialTitle,
          materialType: input.materialType,
          level: input.level,
          sentence: segment.text,
          contextText: input.contextText
        },
        reason
      ),
      generatedAt
    }
  }));
  const expressionMap = new Map<string, AiMaterialExplanation["keyExpressions"][number]>();

  segments.forEach((segment) => {
    segment.explanation.keyExpressions.forEach((expression) => {
      if (!expressionMap.has(expression.text.toLowerCase())) {
        expressionMap.set(expression.text.toLowerCase(), expression);
      }
    });
  });

  return {
    materialTitle: input.materialTitle,
    summaryZh: `本地降级总结：这篇《${input.materialTitle}》适合先逐句听读，理解大意，再保存真实可用表达。`,
    levelNote: `当前标注难度为 ${input.level || "未标注"}。如果听力吃力，可以先按逐句精学方式推进。`,
    segments,
    keyExpressions: Array.from(expressionMap.values()).slice(0, 12),
    source: "fallback",
    provider: reason,
    generatedAt
  };
}

export function createFallbackWritingCorrection(
  input: CorrectWritingInput,
  reason = "AI provider is not configured"
): AiWritingCorrection {
  const originalText = input.userText.trim();
  const sentence = originalText || "Please write one simple English sentence first.";

  return {
    originalText,
    correctedText: sentence,
    feedbackZh:
      "本地降级反馈：先保证句子完整，有主语和动词。初级阶段不要追求复杂句，先把一个意思用自然短句说清楚。",
    keyProblems: [
      "检查是否有主语，例如 I / You / We。",
      "检查是否有核心动词，例如 need / want / have / work。",
      "中文想法不要逐词搬到英文里，优先使用短句。"
    ],
    betterExpressions: [
      {
        text: sentence,
        meaningZh: "可以先把这句话作为待改进表达保存。",
        example: sentence
      }
    ],
    source: "fallback",
    provider: reason,
    generatedAt: new Date().toISOString()
  };
}

export function createFallbackRoleplayTurn(
  input: GenerateRoleplayTurnInput,
  reason = "AI provider is not configured"
): AiRoleplayTurn {
  const learnerTurns = input.transcript.filter((turn) => turn.speaker === "learner");
  const nextIndex = learnerTurns.length;
  const fallbackTurns = [
    {
      partnerLine: "Could you please repeat your main concern?",
      translationZh: "你可以再说一下你的主要问题吗？",
      userGoalZh: "用一句简单英文重复你的主要需求。",
      suggestedReplies: [
        "I would like to make an appointment with a doctor.",
        "I need to see a doctor because I do not feel well."
      ]
    },
    {
      partnerLine: "Can you tell me when the problem started?",
      translationZh: "你能告诉我这个问题什么时候开始的吗？",
      userGoalZh: "说明症状开始的时间。",
      suggestedReplies: [
        "It started yesterday.",
        "I have had this problem since yesterday."
      ]
    },
    {
      partnerLine: "Is there anything else you would like to ask?",
      translationZh: "你还有其他想问的吗？",
      userGoalZh: "询问下一步或确认预约信息。",
      suggestedReplies: [
        "What should I bring to the appointment?",
        "Could you please confirm the appointment time?"
      ]
    }
  ];
  const selected = fallbackTurns[nextIndex % fallbackTurns.length];

  return {
    ...selected,
    source: "fallback",
    provider: reason,
    generatedAt: new Date().toISOString()
  };
}

function pickSegments(input: GeneratePracticeInput) {
  const segments = input.segments
    .filter((segment) => segment.text.trim().length > 0)
    .sort((left, right) => left.order - right.order);

  return segments.length > 0
    ? segments
    : [
        {
          id: "summary",
          order: 1,
          text: input.summary || input.materialTitle
        }
      ];
}

function maskUsefulExpression(sentence: string, keyExpressions: string[]) {
  const expression = keyExpressions.find((item) => sentence.toLowerCase().includes(item.toLowerCase()));

  if (expression) {
    return {
      prompt: sentence.replace(new RegExp(expression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "____"),
      answer: expression
    };
  }

  const word = uniqueUsefulWords(sentence).find((item) => item.length >= 5);

  if (!word) {
    return {
      prompt: sentence,
      answer: sentence
    };
  }

  return {
    prompt: sentence.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "____"),
    answer: word
  };
}

function createGeneratedPracticeDrill(input: AiGeneratedPracticeDrill): AiGeneratedPracticeDrill {
  return {
    ...input,
    hints: input.hints.filter(Boolean).slice(0, 5),
    choices: input.choices?.filter(Boolean).slice(0, 4),
    estimatedMinutes: Math.max(1, Math.min(8, Math.round(input.estimatedMinutes)))
  };
}

export function createFallbackPracticeSet(
  input: GeneratePracticeInput,
  reason = "AI provider is not configured"
): AiGeneratedPracticeSet {
  const generatedAt = new Date().toISOString();
  const segments = pickSegments(input);
  const keyExpressions = input.keyExpressions.filter(Boolean);
  const firstSentence = segments[0]?.text ?? input.summary;
  const secondSentence = segments[1]?.text ?? firstSentence;
  const masked = maskUsefulExpression(firstSentence, keyExpressions);
  const focus = input.focus?.trim() || "材料理解、跟读、复述、写作和场景输出";
  const drills: AiGeneratedPracticeDrill[] = [
    createGeneratedPracticeDrill({
      type: "shadowing",
      title: "AI 跟读加练",
      instruction: "先听或朗读这句话，再完整跟读一遍。",
      prompt: firstSentence,
      answer: firstSentence,
      hints: uniqueUsefulWords(firstSentence).slice(0, 4),
      explanationZh: "本题用于把材料里的真实句子转成可开口练习。",
      estimatedMinutes: 2
    }),
    createGeneratedPracticeDrill({
      type: "cloze",
      title: "AI 场景填空",
      instruction: "补出空格里的词或词块，再读完整句。",
      prompt: masked.prompt,
      answer: masked.answer,
      hints: keyExpressions.slice(0, 3),
      choices: [masked.answer, ...keyExpressions.filter((item) => item !== masked.answer)].slice(0, 4),
      explanationZh: "本题训练材料里的高频表达，不做孤立背单词。",
      estimatedMinutes: 2
    }),
    createGeneratedPracticeDrill({
      type: "qa",
      title: "AI 理解问答",
      instruction: "用一句简单英文回答问题。",
      prompt: `What is the main situation in "${input.materialTitle}"?`,
      answer: input.summary || secondSentence,
      hints: keyExpressions.slice(0, 4),
      explanationZh: "本题检查你是否能用自己的话说出材料场景。",
      estimatedMinutes: 3
    }),
    createGeneratedPracticeDrill({
      type: "writing",
      title: "AI 写作迁移",
      instruction: "用材料里的表达写一句你真实可能会用到的话。",
      prompt: keyExpressions[0]
        ? `Write one sentence with "${keyExpressions[0]}".`
        : `Write one useful sentence for ${input.materialTitle}.`,
      answer: keyExpressions[0] ? `I would like to use "${keyExpressions[0]}" in a real situation.` : firstSentence,
      hints: keyExpressions.slice(0, 4),
      explanationZh: "本题把输入材料迁移到你自己的输出。",
      estimatedMinutes: 4
    }),
    createGeneratedPracticeDrill({
      type: "roleplay",
      title: "AI 角色准备",
      instruction: "准备一句开场白，然后进入角色扮演。",
      prompt: `Start a short conversation about ${input.materialTitle}.`,
      answer: `Hello. I would like to talk about ${input.materialTitle}.`,
      hints: keyExpressions.slice(0, 4),
      explanationZh: "本题把材料内容转成场景口语开场。",
      estimatedMinutes: 3
    })
  ];

  return {
    materialTitle: input.materialTitle,
    level: input.level || "A1",
    focus,
    drills: drills.slice(0, Math.max(1, Math.min(input.targetCount ?? 6, 10))),
    source: "fallback",
    provider: reason,
    generatedAt
  };
}
