import { NextResponse } from "next/server";
import { transcribeAudioFile } from "@/lib/speech/server/transcribe-audio";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析音频表单。" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少音频文件。" }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "音频文件超过 25MB。" }, { status: 413 });
  }

  const result = await transcribeAudioFile({
    file,
    language: readString(formData.get("language")) || "en",
    prompt: readString(formData.get("prompt"))
  });

  return NextResponse.json({ transcription: result });
}
