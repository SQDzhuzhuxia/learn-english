import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/speech/server/synthesize-speech";
import { encodeSpeechHeaderValue } from "@/lib/speech/speech-header-codec";

export const runtime = "nodejs";

const MAX_TTS_TEXT_LENGTH = 4000;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "无法解析 TTS 请求。" }, { status: 400 });
  }

  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const text = readString(data.text);

  if (!text) {
    return NextResponse.json({ error: "缺少要朗读的文本。" }, { status: 400 });
  }

  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return NextResponse.json({ error: "朗读文本过长，请缩短到 4000 字符以内。" }, { status: 413 });
  }

  const result = await synthesizeSpeech({
    text,
    voice: readString(data.voice),
    format: readString(data.format),
    instructions: readString(data.instructions)
  });

  if (!result.audio) {
    return NextResponse.json({ synthesis: result });
  }

  return new Response(result.audio, {
    headers: {
      "Content-Type": result.contentType ?? "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Speech-Source": result.source,
      ...(encodeSpeechHeaderValue(result.provider) ? { "X-Speech-Provider": encodeSpeechHeaderValue(result.provider) } : {}),
      ...(encodeSpeechHeaderValue(result.model) ? { "X-Speech-Model": encodeSpeechHeaderValue(result.model) } : {}),
      ...(encodeSpeechHeaderValue(result.voice) ? { "X-Speech-Voice": encodeSpeechHeaderValue(result.voice) } : {})
    }
  });
}
