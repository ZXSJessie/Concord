import { NextResponse } from "next/server";
import {
  createSpeechmaticsRealtimeJwt,
  getSpeechmaticsOperatingPoint,
  getSpeechmaticsRegion,
  getSpeechmaticsRealtimeLanguage,
  getSpeechmaticsRealtimeMaxDelay,
  getSpeechmaticsRealtimeTtlSeconds,
  getSpeechmaticsRealtimeUrl
} from "@/lib/speechmatics";

export async function GET() {
  try {
    const token = await createSpeechmaticsRealtimeJwt();

    return NextResponse.json(
      {
        token,
        url: getSpeechmaticsRealtimeUrl(),
        region: getSpeechmaticsRegion() ?? "eu",
        language: getSpeechmaticsRealtimeLanguage(),
        maxDelay: getSpeechmaticsRealtimeMaxDelay(),
        ttlSeconds: getSpeechmaticsRealtimeTtlSeconds(),
        operatingPoint: getSpeechmaticsOperatingPoint() ?? null
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Speechmatics token route failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
