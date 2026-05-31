import { NextResponse } from "next/server";
import { summarizeLocalSpeechReadiness } from "@/lib/speech/server/local-speech-readiness";

export async function GET() {
  return NextResponse.json(summarizeLocalSpeechReadiness());
}
