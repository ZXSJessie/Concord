import { NextResponse } from "next/server";
import {
  createSpeechmaticsRealtimeJwt,
  getSpeechmaticsApiKey,
  getSpeechmaticsOperatingPoint,
  getSpeechmaticsRegion,
  getSpeechmaticsRealtimeLanguage,
  getSpeechmaticsRealtimeMaxDelay,
  getSpeechmaticsRealtimeTtlSeconds,
  getSpeechmaticsRealtimeUrl
} from "@/lib/speechmatics";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function maskKey(key: string): string {
  return key.length > 8 ? `…${key.slice(-4)}` : "…";
}

export async function GET() {
  try {
    const token = await createSpeechmaticsRealtimeJwt();
    const payload = decodeJwtPayload(token);

    return NextResponse.json(
      {
        token,
        url: getSpeechmaticsRealtimeUrl(),
        region: getSpeechmaticsRegion() ?? "eu",
        language: getSpeechmaticsRealtimeLanguage(),
        maxDelay: getSpeechmaticsRealtimeMaxDelay(),
        ttlSeconds: getSpeechmaticsRealtimeTtlSeconds(),
        operatingPoint: getSpeechmaticsOperatingPoint() ?? null,
        jwtAudience: (payload?.aud as string | undefined) ?? null,
        keyFingerprint: maskKey(getSpeechmaticsApiKey())
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Speechmatics token route failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
