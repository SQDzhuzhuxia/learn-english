import { NextResponse } from "next/server";
import { generatePractice } from "@/lib/ai/server/explain-segment";
import type { GeneratePracticeInput, GeneratePracticeSegmentInput } from "@/lib/ai/types";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 20);
}

function normalizeSegments(value: unknown): GeneratePracticeSegmentInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const text = readString(record.text);

      if (text.length < 2) {
        return undefined;
      }

      const order = typeof record.order === "number" ? record.order : index + 1;

      return {
        id: readString(record.id) || `segment-${index + 1}`,
        order,
        text: text.slice(0, 600)
      };
    })
    .filter((segment): segment is GeneratePracticeSegmentInput => Boolean(segment))
    .slice(0, 40);
}

function normalizeInput(raw: unknown): { input?: GeneratePracticeInput; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "请求体格式不正确。" };
  }

  const record = raw as Record<string, unknown>;
  const materialTitle = readString(record.materialTitle);
  const segments = normalizeSegments(record.segments);

  if (!materialTitle) {
    return { error: "缺少材料标题。" };
  }

  if (segments.length === 0 && !readString(record.summary)) {
    return { error: "缺少可生成练习的材料内容。" };
  }

  const rawTargetCount = typeof record.targetCount === "number" ? record.targetCount : Number(readString(record.targetCount));
  const targetCount = Number.isFinite(rawTargetCount) ? Math.max(1, Math.min(Math.round(rawTargetCount), 10)) : 8;

  return {
    input: {
      materialId: readString(record.materialId) || undefined,
      materialTitle,
      materialType: readString(record.materialType) || "英语材料",
      level: readString(record.level) || "A1",
      summary: readString(record.summary).slice(0, 1200),
      keyExpressions: readStringArray(record.keyExpressions),
      segments,
      targetCount,
      focus: readString(record.focus).slice(0, 200) || undefined
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

  const practiceSet = await generatePractice(normalized.input);
  return NextResponse.json({ practiceSet });
}
