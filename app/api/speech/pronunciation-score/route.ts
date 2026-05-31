import { NextResponse } from "next/server";
import { scorePronunciation } from "@/lib/speech/server/pronunciation-score";

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
    return NextResponse.json({ error: "无法解析发音评分表单。" }, { status: 400 });
  }

  const file = formData.get("file");
  const referenceText = readString(formData.get("referenceText")) || readString(formData.get("reference_text"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少音频文件。" }, { status: 400 });
  }

  if (!referenceText) {
    return NextResponse.json({ error: "缺少跟读目标文本。" }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "音频文件超过 25MB。" }, { status: 413 });
  }

  const result = await scorePronunciation({
    file,
    referenceText,
    transcript: readString(formData.get("transcript"))
  });

  return NextResponse.json({ pronunciation: result });
}
