import { afterEach, describe, expect, it, vi } from "vitest";
import {
  correctWritingWithOpenAiCompatible,
  explainMaterialWithOpenAiCompatible,
  explainSegmentWithOpenAiCompatible,
  generatePracticeWithOpenAiCompatible,
  generateRoleplayTurnWithOpenAiCompatible,
  parseMaterialExplanationResponse,
  parsePracticeGenerationResponse,
  parseRoleplayTurnResponse,
  parseSegmentExplanationResponse,
  parseWritingCorrectionResponse
} from "@/lib/ai/openai-compatible";
import type {
  CorrectWritingInput,
  ExplainMaterialInput,
  ExplainSegmentInput,
  GeneratePracticeInput,
  GenerateRoleplayTurnInput
} from "@/lib/ai/types";

const input: ExplainSegmentInput = {
  materialTitle: "Apartment Tour",
  materialType: "租房",
  level: "A1",
  sentence: "Is the apartment available next month?",
  contextText: "I am looking for an apartment near my office."
};

const materialInput: ExplainMaterialInput = {
  materialTitle: "Apartment Tour",
  materialType: "租房",
  level: "A1",
  contextText: "Is the apartment available next month? How much is the deposit?",
  segments: [
    {
      id: "s1",
      order: 1,
      text: "Is the apartment available next month?"
    },
    {
      id: "s2",
      order: 2,
      text: "How much is the deposit?"
    }
  ]
};

const writingInput: CorrectWritingInput = {
  promptTitle: "预约短信",
  prompt: "用英文写一句：我想预约医生。",
  level: "A1",
  userText: "I want see doctor."
};

const roleplayInput: GenerateRoleplayTurnInput = {
  scenarioTitle: "前台预约医生",
  setting: "美国诊所前台电话预约",
  goal: "完成预约医生需求",
  level: "A1",
  partnerRole: "诊所前台",
  learnerRole: "病人",
  transcript: [
    {
      speaker: "partner",
      text: "Good morning. How can I help you?"
    },
    {
      speaker: "learner",
      text: "I would like to make an appointment with a doctor."
    }
  ]
};

const practiceInput: GeneratePracticeInput = {
  materialId: "apartment-tour",
  materialTitle: "Apartment Tour",
  materialType: "租房",
  level: "A1",
  summary: "Mia asks about rent and the deposit.",
  keyExpressions: ["security deposit", "available next month"],
  targetCount: 3,
  segments: materialInput.segments
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseSegmentExplanationResponse", () => {
  it("normalizes provider JSON into an app explanation", () => {
    const explanation = parseSegmentExplanationResponse(
      JSON.stringify({
        sentence: input.sentence,
        meaningZh: "询问公寓下个月是否可租。",
        structure: ["Is ... available：是否可用", "next month：下个月"],
        keyExpressions: [
          {
            text: "available",
            meaningZh: "可用的，可租的",
            example: input.sentence
          }
        ],
        commonMistake: "不要说 can use apartment。",
        shadowingTip: "available 前后稍微停顿。"
      }),
      input,
      "Test Provider"
    );

    expect(explanation.source).toBe("model");
    expect(explanation.provider).toBe("Test Provider");
    expect(explanation.keyExpressions[0]?.text).toBe("available");
  });
});

describe("parseMaterialExplanationResponse", () => {
  it("normalizes batch provider JSON into material explanations", () => {
    const explanation = parseMaterialExplanationResponse(
      JSON.stringify({
        materialTitle: materialInput.materialTitle,
        summaryZh: "租房看房相关材料。",
        levelNote: "适合 A1 学习者逐句输入。",
        segments: [
          {
            segmentId: "s1",
            order: 1,
            meaningZh: "询问公寓是否可租。",
            structure: ["Is ... available：是否可用"],
            keyExpressions: [
              {
                text: "available",
                meaningZh: "可用的，可租的",
                example: "Is the apartment available next month?"
              }
            ],
            commonMistake: "不要说 can use apartment。",
            shadowingTip: "available 前后稍微停顿。"
          }
        ],
        keyExpressions: [
          {
            text: "deposit",
            meaningZh: "押金",
            example: "How much is the deposit?"
          }
        ]
      }),
      materialInput,
      "Test Provider"
    );

    expect(explanation.source).toBe("model");
    expect(explanation.segments[0]?.segmentId).toBe("s1");
    expect(explanation.keyExpressions[0]?.text).toBe("deposit");
  });
});

describe("parseWritingCorrectionResponse", () => {
  it("normalizes writing correction JSON", () => {
    const correction = parseWritingCorrectionResponse(
      JSON.stringify({
        originalText: writingInput.userText,
        correctedText: "I want to see a doctor.",
        feedbackZh: "see 前面需要 to。",
        keyProblems: ["want 后面接 to do"],
        betterExpressions: [
          {
            text: "I want to see a doctor.",
            meaningZh: "我想看医生。",
            example: "I want to see a doctor."
          }
        ]
      }),
      writingInput,
      "Test Provider"
    );

    expect(correction.source).toBe("model");
    expect(correction.correctedText).toContain("to see");
    expect(correction.keyProblems[0]).toContain("want");
  });
});

describe("parseRoleplayTurnResponse", () => {
  it("normalizes roleplay turn JSON", () => {
    const turn = parseRoleplayTurnResponse(
      JSON.stringify({
        partnerLine: "What seems to be the problem?",
        translationZh: "您哪里不舒服？",
        userGoalZh: "说明你的症状。",
        suggestedReplies: ["I have a sore throat.", "My throat hurts."]
      }),
      roleplayInput,
      "Test Provider"
    );

    expect(turn.source).toBe("model");
    expect(turn.partnerLine).toContain("problem");
    expect(turn.suggestedReplies).toContain("I have a sore throat.");
  });
});

describe("parsePracticeGenerationResponse", () => {
  it("normalizes generated practice JSON", () => {
    const practiceSet = parsePracticeGenerationResponse(
      JSON.stringify({
        materialTitle: "Apartment Tour",
        level: "A1",
        focus: "租房看房",
        drills: [
          {
            type: "cloze",
            title: "押金填空",
            instruction: "补全空格。",
            prompt: "How much is the ____?",
            answer: "deposit",
            hints: ["security deposit"],
            choices: ["deposit", "rent"],
            explanationZh: "练习租房押金表达。",
            estimatedMinutes: 2
          }
        ]
      }),
      practiceInput,
      "Test Provider"
    );

    expect(practiceSet.source).toBe("model");
    expect(practiceSet.drills[0]?.type).toBe("cloze");
    expect(practiceSet.drills[0]?.answer).toBe("deposit");
  });
});

describe("explainSegmentWithOpenAiCompatible", () => {
  it("calls a chat-completions compatible endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sentence: input.sentence,
                  meaningZh: "询问公寓下个月是否可租。",
                  structure: ["Is ... available：是否可用"],
                  keyExpressions: [
                    {
                      text: "available",
                      meaningZh: "可用的，可租的",
                      example: input.sentence
                    }
                  ],
                  commonMistake: "不要逐词翻译。",
                  shadowingTip: "先慢速读完整句。"
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const explanation = await explainSegmentWithOpenAiCompatible(input, {
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Local Test",
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key"
        })
      })
    );
    expect(explanation.meaningZh).toContain("公寓");
  });

  it("calls a chat-completions compatible endpoint for batch material explanations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  materialTitle: materialInput.materialTitle,
                  summaryZh: "租房看房相关材料。",
                  levelNote: "适合 A1 学习者逐句输入。",
                  segments: [
                    {
                      segmentId: "s1",
                      order: 1,
                      meaningZh: "询问公寓是否可租。",
                      structure: ["Is ... available：是否可用"],
                      keyExpressions: [
                        {
                          text: "available",
                          meaningZh: "可用的",
                          example: "Is the apartment available next month?"
                        }
                      ],
                      commonMistake: "不要逐词翻译。",
                      shadowingTip: "先慢速读完整句。"
                    }
                  ],
                  keyExpressions: []
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const explanation = await explainMaterialWithOpenAiCompatible(materialInput, {
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Local Test",
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(explanation.segments).toHaveLength(1);
  });

  it("calls a chat-completions compatible endpoint for writing corrections", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  originalText: writingInput.userText,
                  correctedText: "I want to see a doctor.",
                  feedbackZh: "see 前面需要 to。",
                  keyProblems: ["want 后面接 to do"],
                  betterExpressions: [
                    {
                      text: "I want to see a doctor.",
                      meaningZh: "我想看医生。",
                      example: "I want to see a doctor."
                    }
                  ]
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const correction = await correctWritingWithOpenAiCompatible(writingInput, {
      baseUrl: "http://localhost:11434/v1",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Local Test",
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(correction.correctedText).toContain("doctor");
  });

  it("calls a chat-completions compatible endpoint for roleplay turns", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  partnerLine: "What seems to be the problem?",
                  translationZh: "您哪里不舒服？",
                  userGoalZh: "说明你的症状。",
                  suggestedReplies: ["I have a sore throat.", "My throat hurts."]
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const turn = await generateRoleplayTurnWithOpenAiCompatible(roleplayInput, {
      baseUrl: "http://localhost:11434/v1",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Local Test",
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(turn.partnerLine).toContain("problem");
  });
});

describe("generatePracticeWithOpenAiCompatible", () => {
  it("calls a chat-completions compatible endpoint for practice generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  materialTitle: "Apartment Tour",
                  level: "A1",
                  focus: "租房看房",
                  drills: [
                    {
                      type: "qa",
                      title: "理解问答",
                      instruction: "回答问题。",
                      prompt: "What does Mia ask about?",
                      answer: "She asks about the rent and the deposit.",
                      hints: ["rent", "deposit"],
                      choices: [],
                      explanationZh: "检查材料理解。",
                      estimatedMinutes: 3
                    }
                  ]
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const practiceSet = await generatePracticeWithOpenAiCompatible(practiceInput, {
      baseUrl: "https://example.test/v1",
      apiKey: "test-key",
      model: "test-model",
      providerLabel: "Test Provider",
      timeoutMs: 1000
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(practiceSet.source).toBe("model");
    expect(practiceSet.drills[0]?.title).toBe("理解问答");
  });
});
