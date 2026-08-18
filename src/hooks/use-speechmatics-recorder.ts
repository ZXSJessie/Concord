"use client";

import { useEffect, useRef, useState } from "react";
import { RealtimeClient, type RealtimeServerMessage } from "@speechmatics/real-time-client";
import { concatInt16Arrays, downsampleToInt16Pcm, int16ArrayToUint8Array, PCM_FRAME_SAMPLES } from "@/lib/audio/pcm";

interface SpeechmaticsTokenResponse {
  token: string;
  url: string;
  language: string;
  maxDelay: number;
  ttlSeconds: number;
  operatingPoint: "standard" | "enhanced" | null;
  region: string;
}

interface UseSpeechmaticsRecorderOptions {
  onTranscript: (transcript: string, meta: { isFinal: boolean }) => void;
  onError?: (message: string) => void;
  resetOnStart?: boolean;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error("服務端返回了空響應。");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`服務端返回了非 JSON 響應：${text.slice(0, 200)}`);
  }
}

function buildTranscript(finalSegments: string[], partialTranscript: string) {
  return [...finalSegments, partialTranscript].filter(Boolean).join("").trim();
}

function toFriendlySpeechmaticsError(
  reason: string | undefined,
  endpoint: { url?: string; region?: string } | null
): string {
  if (reason === "not_authorised") {
    const detail =
      endpoint && (endpoint.url || endpoint.region)
        ? `（url: ${endpoint.url}, region: ${endpoint.region}）`
        : "";
    return `Speechmatics 授權失敗${detail}：請檢查 API Key，並確認 SPEECHMATICS_REGION 與 SPEECHMATICS_RT_URL 對應帳號區域。`;
  }

  return reason || "語音轉寫失敗";
}

export function useSpeechmaticsRecorder({
  onTranscript,
  onError,
  resetOnStart = true
}: UseSpeechmaticsRecorderOptions) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sinkNodeRef = useRef<GainNode | null>(null);
  const speechmaticsClientRef = useRef<RealtimeClient | null>(null);
  const pcmBufferRef = useRef<Int16Array<ArrayBufferLike>>(new Int16Array(0));
  const recordingStartedAtRef = useRef<number | null>(null);
  const firstTranscriptAtRef = useRef<number | null>(null);
  const finalSegmentsRef = useRef<string[]>([]);
  const partialTranscriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const speechmaticsEndpointRef = useRef<{ url?: string; region?: string } | null>(null);

  const [isSupported, setIsSupported] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [latencyLabel, setLatencyLabel] = useState<string | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onError, onTranscript]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      typeof AudioContext === "undefined" ||
      typeof WebSocket === "undefined"
    ) {
      setIsSupported(false);
    }

    return () => {
      teardownAudioPipeline();
      closeSpeechmaticsClient();
    };
  }, []);

  function teardownAudioPipeline() {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    sinkNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    workletNodeRef.current = null;
    sinkNodeRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  function closeSpeechmaticsClient() {
    if (!speechmaticsClientRef.current) {
      return;
    }

    speechmaticsClientRef.current = null;
  }

  function updateLatencyLabel(finalized = false) {
    const startedAt = recordingStartedAtRef.current;

    if (!startedAt) {
      return;
    }

    const now = Date.now();

    if (firstTranscriptAtRef.current == null) {
      firstTranscriptAtRef.current = now;
    }

    const firstLatencyMs = firstTranscriptAtRef.current - startedAt;
    const parts = [`首條轉寫 ${firstLatencyMs}ms`];

    if (finalized) {
      parts.push(`最終定稿 ${now - startedAt}ms`);
    }

    setLatencyLabel(parts.join(" · "));
  }

  function handleSpeechmaticsMessage(message: RealtimeServerMessage) {
    if (message.message === "AddPartialTranscript") {
      partialTranscriptRef.current = message.metadata.transcript.trim();
      const transcript = buildTranscript(finalSegmentsRef.current, partialTranscriptRef.current);
      onTranscriptRef.current(transcript, { isFinal: false });
      updateLatencyLabel(false);
      return;
    }

    if (message.message === "AddTranscript") {
      const segmentTranscript = message.metadata.transcript.trim();

      if (segmentTranscript) {
        finalSegmentsRef.current = [...finalSegmentsRef.current, segmentTranscript];
      }

      partialTranscriptRef.current = "";
      const transcript = buildTranscript(finalSegmentsRef.current, partialTranscriptRef.current);
      onTranscriptRef.current(transcript, { isFinal: true });
      updateLatencyLabel(true);
      return;
    }

    if (message.message === "EndOfTranscript") {
      const transcript = buildTranscript(finalSegmentsRef.current, partialTranscriptRef.current);
      onTranscriptRef.current(transcript, { isFinal: true });
      setIsPending(false);
      closeSpeechmaticsClient();
      return;
    }

    if (message.message === "Error") {
      const reason = message.reason || "語音轉寫失敗";
      onErrorRef.current?.(toFriendlySpeechmaticsError(reason, speechmaticsEndpointRef.current));
      setIsPending(false);
      closeSpeechmaticsClient();
    }
  }

  async function openSpeechmaticsClient(): Promise<RealtimeClient> {
    const response = await fetch("/api/speechmatics/token");
    const payload = await readJsonResponse<SpeechmaticsTokenResponse & { error?: string }>(response);

    if (!response.ok || !payload.token) {
      throw new Error(payload.error ?? "獲取 Speechmatics token 失敗。");
    }

    speechmaticsEndpointRef.current = {
      url: payload.url,
      region: payload.region
    };

    const client = new RealtimeClient({
      url: payload.url,
      appId: "concord-demo"
    });

    client.addEventListener("receiveMessage", (event) => {
      handleSpeechmaticsMessage(event.data);
    });

    await client.start(payload.token, {
      audio_format: {
        type: "raw",
        encoding: "pcm_s16le",
        sample_rate: 16000
      },
      transcription_config: {
        language: payload.language,
        enable_partials: true,
        max_delay: payload.maxDelay,
        operating_point: payload.operatingPoint ?? undefined
      }
    });

    speechmaticsClientRef.current = client;
    return client;
  }

  function flushPcmFrames(sendPartial: boolean) {
    const client = speechmaticsClientRef.current;

    if (!client) {
      return;
    }

    while (pcmBufferRef.current.length >= PCM_FRAME_SAMPLES) {
      const frame = pcmBufferRef.current.slice(0, PCM_FRAME_SAMPLES);
      pcmBufferRef.current = pcmBufferRef.current.slice(PCM_FRAME_SAMPLES);
      client.sendAudio(int16ArrayToUint8Array(frame));
    }

    if (sendPartial && pcmBufferRef.current.length > 0) {
      client.sendAudio(int16ArrayToUint8Array(pcmBufferRef.current));
      pcmBufferRef.current = new Int16Array(0);
    }
  }

  function handleAudioChunk(input: Float32Array, inputSampleRate: number) {
    const pcmChunk = downsampleToInt16Pcm(input, inputSampleRate);
    pcmBufferRef.current = concatInt16Arrays(pcmBufferRef.current, pcmChunk);
    flushPcmFrames(false);
  }

  async function startRecording() {
    if (isStarting || isRecording || isPending) {
      return;
    }

    setIsStarting(true);

    if (
      !isSupported ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof AudioWorkletNode === "undefined"
    ) {
      setIsSupported(false);
      setIsStarting(false);
      onErrorRef.current?.("當前瀏覽器不支持低延遲錄音，請改用最新版 Chrome。");
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      await openSpeechmaticsClient();

      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule("/audio-worklet-recorder.js");
      await audioContext.resume();

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "recorder-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: "explicit"
      });
      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;

      pcmBufferRef.current = new Int16Array(0);

      if (resetOnStart) {
        finalSegmentsRef.current = [];
        partialTranscriptRef.current = "";
      }

      recordingStartedAtRef.current = Date.now();
      firstTranscriptAtRef.current = null;
      setLatencyLabel(null);

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!speechmaticsClientRef.current) {
          return;
        }

        const chunk = event.data instanceof Float32Array ? event.data : new Float32Array(event.data);
        handleAudioChunk(chunk, audioContext.sampleRate);
      };

      sourceNode.connect(workletNode);
      workletNode.connect(sinkNode);
      sinkNode.connect(audioContext.destination);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      workletNodeRef.current = workletNode;
      sinkNodeRef.current = sinkNode;

      setIsPending(true);
      setIsRecording(true);
      setIsStarting(false);
    } catch (currentError) {
      stream?.getTracks().forEach((track) => track.stop());
      teardownAudioPipeline();
      closeSpeechmaticsClient();
      setIsStarting(false);
      setIsPending(false);
      setIsRecording(false);
      const message = currentError instanceof Error ? currentError.message : "錄音啟動失敗";
      onErrorRef.current?.(toFriendlySpeechmaticsError(message, speechmaticsEndpointRef.current));
    }
  }

  function stopRecording() {
    if (!speechmaticsClientRef.current) {
      teardownAudioPipeline();
      setIsStarting(false);
      setIsRecording(false);
      setIsPending(false);
      return;
    }

    flushPcmFrames(true);
    void speechmaticsClientRef.current.stopRecognition().catch((currentError: unknown) => {
      const message = currentError instanceof Error ? currentError.message : "結束實時轉寫失敗";
      onErrorRef.current?.(toFriendlySpeechmaticsError(message, speechmaticsEndpointRef.current));
      setIsPending(false);
      closeSpeechmaticsClient();
    });
    teardownAudioPipeline();
    setIsStarting(false);
    setIsRecording(false);
  }

  function resetRecorder() {
    teardownAudioPipeline();

    if (speechmaticsClientRef.current) {
      void speechmaticsClientRef.current.stopRecognition({ noTimeout: true }).catch(() => {});
    }

    closeSpeechmaticsClient();
    pcmBufferRef.current = new Int16Array(0);
    finalSegmentsRef.current = [];
    partialTranscriptRef.current = "";
    recordingStartedAtRef.current = null;
    firstTranscriptAtRef.current = null;
    setIsStarting(false);
    setIsRecording(false);
    setIsPending(false);
    setLatencyLabel(null);
  }

  return {
    isSupported,
    isStarting,
    isRecording,
    isPending,
    latencyLabel,
    startRecording,
    stopRecording,
    resetRecorder
  };
}
