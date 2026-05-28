import { NextResponse } from "next/server";
import { explainMaterial } from "@/lib/ai/server/explain-segment";
import type { ExplainMaterialInput, ExplainMaterialSegmentInput } from "@/lib/ai/types";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSegments(value: unknown): ExplainMaterialSegmentInput[] {
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

      return {
        id: readString(record.id) || `segment-${index + 1}`,
        order:
          typeof record.order === "number"
            ? record.order
            : Number.parseInt(readString(record.order), 10) || index + 1,
        text
      };
    })
    .filter((segment): segment is ExplainMaterialSegmentInput => Boolean(segment))
    .slice(0, 60);
}

function normalizeInput(raw: unknown): { input?: ExplainMaterialInput; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "请求体格式不正确。" };
  }

  const record = raw as Record<string, unknown>;
  const materialTitle = readString(record.materialTitle);
  const segments = normalizeSegments(record.segments);

  if (!materialTitle) {
    return { error: "缺少材料标题。" };
  }

  if (segments.length === 0) {
    return { error: "缺少可解释的材料分句。" };
  }

  return {
    input: {
      materialTitle,
      materialType: readString(record.materialType) || "未分类",
      level: readString(record.level) || "A1",
      segments,
      contextText: readString(record.contextText).slice(0, 6000)
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

  const explanation = await explainMaterial(normalized.input);
  return NextResponse.json({ explanation });
}
