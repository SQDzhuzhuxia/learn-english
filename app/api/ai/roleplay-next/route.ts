import { NextResponse } from "next/server";
import { generateRoleplayTurn } from "@/lib/ai/server/explain-segment";
import type { GenerateRoleplayTurnInput, RoleplayTranscriptTurn } from "@/lib/ai/types";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTranscript(value: unknown): RoleplayTranscriptTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const speaker = record.speaker === "partner" || record.speaker === "learner" ? record.speaker : undefined;
      const text = readString(record.text);

      if (!speaker || text.length < 2) {
        return undefined;
      }

      return {
        speaker,
        text: text.slice(0, 800)
      };
    })
    .filter((turn): turn is RoleplayTranscriptTurn => Boolean(turn))
    .slice(-12);
}

function normalizeInput(raw: unknown): { input?: GenerateRoleplayTurnInput; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "请求体格式不正确。" };
  }

  const record = raw as Record<string, unknown>;
  const scenarioTitle = readString(record.scenarioTitle);
  const setting = readString(record.setting);
  const goal = readString(record.goal);
  const transcript = normalizeTranscript(record.transcript);

  if (!scenarioTitle || !setting || !goal) {
    return { error: "缺少角色扮演场景信息。" };
  }

  return {
    input: {
      scenarioTitle,
      setting,
      goal,
      level: readString(record.level) || "A1-A2",
      partnerRole: readString(record.partnerRole) || "AI 扮演对话伙伴。",
      learnerRole: readString(record.learnerRole) || "学习者用简单英文回答。",
      transcript
    }
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无法解析请求 JSON。" }, { status: 400 });
  }

  const normalized = normalizeInput(body);

  if (!normalized.input) {
    return NextResponse.json({ error: normalized.error ?? "请求参数不完整。" }, { status: 400 });
  }

  const turn = await generateRoleplayTurn(normalized.input);
  return NextResponse.json({ turn });
}
