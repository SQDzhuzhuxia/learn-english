import { NextResponse } from "next/server";
import { explainSegment } from "@/lib/ai/server/explain-segment";
import type { ExplainSegmentInput } from "@/lib/ai/types";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInput(raw: unknown): { input?: ExplainSegmentInput; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "请求体格式不正确。" };
  }

  const record = raw as Record<string, unknown>;
  const sentence = readString(record.sentence);
  const materialTitle = readString(record.materialTitle);

  if (sentence.length < 2) {
    return { error: "当前句太短，无法生成解释。" };
  }

  if (!materialTitle) {
    return { error: "缺少材料标题。" };
  }

  return {
    input: {
      sentence,
      materialTitle,
      materialType: readString(record.materialType) || "未分类",
      level: readString(record.level) || "A1",
      contextText: readString(record.contextText).slice(0, 4000)
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

  const explanation = await explainSegment(normalized.input);
  return NextResponse.json({ explanation });
}
