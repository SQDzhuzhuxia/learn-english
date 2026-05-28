import { NextResponse } from "next/server";
import { correctWriting } from "@/lib/ai/server/explain-segment";
import type { CorrectWritingInput } from "@/lib/ai/types";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInput(raw: unknown): { input?: CorrectWritingInput; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "请求体格式不正确。" };
  }

  const record = raw as Record<string, unknown>;
  const userText = readString(record.userText);

  if (userText.length < 2) {
    return { error: "请先写一句英文。" };
  }

  return {
    input: {
      promptTitle: readString(record.promptTitle) || "短写作",
      prompt: readString(record.prompt) || "请写一句简单英文。",
      level: readString(record.level) || "A1",
      userText: userText.slice(0, 4000)
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

  const correction = await correctWriting(normalized.input);
  return NextResponse.json({ correction });
}
