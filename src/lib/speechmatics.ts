import { createSpeechmaticsJWT } from "@speechmatics/auth";

type SpeechmaticsRegion = "eu" | "usa" | "au";
type SpeechmaticsOperatingPoint = "standard" | "enhanced";

const REGION_RT_HOSTS: Record<SpeechmaticsRegion, string[]> = {
  eu: ["eu2.rt.speechmatics.com"],
  usa: ["usa2.rt.speechmatics.com"],
  au: ["au2.rt.speechmatics.com"]
};

const DEFAULT_RT_URLS: Record<SpeechmaticsRegion, string> = {
  eu: "wss://eu2.rt.speechmatics.com/v2",
  usa: "wss://usa2.rt.speechmatics.com/v2",
  au: "wss://au2.rt.speechmatics.com/v2"
};

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSpeechmaticsApiKey(): string {
  const apiKey = process.env.SPEECHMATICS_API_KEY;

  if (!apiKey) {
    throw new Error("SPEECHMATICS_API_KEY is missing.");
  }

  return apiKey;
}

export function getSpeechmaticsRealtimeUrl(): string {
  const raw = process.env.SPEECHMATICS_RT_URL?.trim();
  const region = getSpeechmaticsRegion();

  if (raw) {
    let host = "";
    try {
      host = new URL(raw).hostname;
    } catch {
      // fall through to canonical URL below
    }

    if (host && REGION_RT_HOSTS[region ?? "eu"].includes(host)) {
      return raw;
    }

    if (host) {
      console.warn(
        `SPEECHMATICS_RT_URL host "${host}" does not match SPEECHMATICS_REGION "${region ?? "eu"}", falling back to ${DEFAULT_RT_URLS[region ?? "eu"]}.`
      );
    }
  }

  return DEFAULT_RT_URLS[region ?? "eu"];
}

export function getSpeechmaticsRealtimeLanguage(): string {
  return process.env.SPEECHMATICS_RT_LANGUAGE ?? "yue";
}

export function getSpeechmaticsRealtimeTtlSeconds(): number {
  return parseNumber(process.env.SPEECHMATICS_RT_TTL_SECONDS, 60);
}

export function getSpeechmaticsRealtimeMaxDelay(): number {
  return parseNumber(process.env.SPEECHMATICS_RT_MAX_DELAY, 0.7);
}

export function getSpeechmaticsOperatingPoint(): SpeechmaticsOperatingPoint | undefined {
  const operatingPoint = process.env.SPEECHMATICS_RT_OPERATING_POINT;

  if (operatingPoint === "standard" || operatingPoint === "enhanced") {
    return operatingPoint;
  }

  return undefined;
}

export function getSpeechmaticsRegion(): SpeechmaticsRegion | undefined {
  const region = process.env.SPEECHMATICS_REGION;

  if (region === "eu" || region === "usa" || region === "au") {
    return region;
  }

  return undefined;
}

export async function createSpeechmaticsRealtimeJwt(): Promise<string> {
  return await createSpeechmaticsJWT({
    type: "rt",
    apiKey: getSpeechmaticsApiKey(),
    ttl: getSpeechmaticsRealtimeTtlSeconds(),
    region: getSpeechmaticsRegion()
  });
}
