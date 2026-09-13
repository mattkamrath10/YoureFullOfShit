"use client";

import type { VoiceHint } from "@/lib/narrators";

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function appendTranscript(existing: string, spoken: string): string {
  const piece = spoken.trim();
  if (!piece) return existing;
  const base = existing.replace(/\s+$/, "");
  if (!base) return piece;
  const needsSpace = !/[\s\n]$/.test(base);
  return `${base}${needsSpace ? " " : ""}${piece}`;
}

const FEMALE_RE =
  /female|samantha|victoria|karen|moira|tessa|fiona|zira|susan|linda|heather|salli|ivy|joanna|kendra|kimberly|amy|emma|olivia|allison|ava|susan|karen|samantha|google uk english female|microsoft zira|microsoft eva/i;
const MALE_RE =
  /male|daniel|david|mark|fred|alex|tom|james|matthew|justin|joey|brian|ravi|google uk english male|microsoft david|microsoft mark|microsoft guy/i;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, 1500);
  });
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  hint: VoiceHint,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en\b/i.test(v.lang));
  const pool = en.length ? en : voices;

  const byHint = (v: SpeechSynthesisVoice) => {
    const label = `${v.name} ${v.voiceURI} ${v.lang}`;
    if (hint === "female") return FEMALE_RE.test(label) && !MALE_RE.test(label);
    if (hint === "male") return MALE_RE.test(label);
    return true;
  };

  const matched = pool.find(byHint);
  if (matched) return matched;
  if (hint === "neutral") {
    const mid = pool.find((v) => !FEMALE_RE.test(v.name) && !MALE_RE.test(v.name));
    return mid ?? pool[0] ?? null;
  }
  return pool[0] ?? null;
}

function splitChunks(text: string, maxLen = 1800): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const parts: string[] = [];
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  let buf = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const next = buf ? `${buf} ${sentence}` : sentence;
    if (next.length > maxLen) {
      if (buf) parts.push(buf);
      if (sentence.length > maxLen) {
        for (let i = 0; i < sentence.length; i += maxLen) {
          parts.push(sentence.slice(i, i + maxLen));
        }
        buf = "";
      } else {
        buf = sentence;
      }
    } else {
      buf = next;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

let speakToken = 0;
let keepAliveTimer: number | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function clearKeepAlive() {
  if (keepAliveTimer != null) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function stopAudioPlayback() {
  if (currentAudio) {
    try {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {
      /* ignore */
    }
    currentObjectUrl = null;
  }
}

export function stopStorySpeech() {
  speakToken += 1;
  clearKeepAlive();
  stopAudioPlayback();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function isStorySpeechActive(): boolean {
  if (typeof window === "undefined") return false;
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  if (!window.speechSynthesis) return false;
  return window.speechSynthesis.speaking || window.speechSynthesis.pending;
}

export async function speakStory(args: {
  text: string;
  voiceHint: VoiceHint;
  rate: number;
  pitch: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): Promise<void> {
  if (!isSpeechSynthesisSupported()) {
    args.onError?.("This browser can’t read the story aloud.");
    return;
  }

  const chunks = splitChunks(args.text);
  if (!chunks.length) {
    args.onError?.("There’s no text to read.");
    return;
  }

  stopStorySpeech();
  const myToken = speakToken;

  const voices = await loadVoices();
  if (myToken !== speakToken) return;

  const voice = pickVoice(voices, args.voiceHint);

  args.onStart?.();

  clearKeepAlive();
  keepAliveTimer = window.setInterval(() => {
    if (myToken !== speakToken) {
      clearKeepAlive();
      return;
    }
    if (!window.speechSynthesis.speaking) return;
    try {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }, 12000);

  const speakChunk = (index: number) => {
    if (myToken !== speakToken) return;
    if (index >= chunks.length) {
      clearKeepAlive();
      args.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.rate = args.rate;
    utterance.pitch = args.pitch;
    utterance.lang = voice?.lang || "en-US";
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (myToken !== speakToken) return;
      speakChunk(index + 1);
    };
    utterance.onerror = (event) => {
      if (myToken !== speakToken) return;
      if (event.error === "canceled" || event.error === "interrupted") return;
      clearKeepAlive();
      args.onError?.("Could not finish reading. You can still read the story on the page.");
      args.onEnd?.();
    };

    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    window.speechSynthesis.speak(utterance);
  };

  speakChunk(0);
}

/**
 * Prefer OpenAI TTS via /api/narrate; fall back to browser SpeechSynthesis.
 */
export async function speakStorySmart(args: {
  text: string;
  narratorId: string;
  voiceHint: VoiceHint;
  rate: number;
  pitch: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): Promise<void> {
  stopStorySpeech();
  const myToken = speakToken;

  const fallbackBrowser = async () => {
    if (myToken !== speakToken) return;
    await speakStory({
      text: args.text,
      voiceHint: args.voiceHint,
      rate: args.rate,
      pitch: args.pitch,
      onStart: args.onStart,
      onEnd: args.onEnd,
      onError: args.onError,
    });
  };

  if (!args.text.trim()) {
    args.onError?.("There’s no text to read.");
    return;
  }

  let response: Response;
  try {
    response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: args.text, narratorId: args.narratorId }),
    });
  } catch {
    await fallbackBrowser();
    return;
  }

  if (myToken !== speakToken) return;

  if (response.status === 503) {
    let code = "";
    try {
      const body = (await response.json()) as { error?: string };
      code = body.error ?? "";
    } catch {
      /* ignore */
    }
    if (code === "not_configured" || !code) {
      await fallbackBrowser();
      return;
    }
    await fallbackBrowser();
    return;
  }

  if (!response.ok) {
    await fallbackBrowser();
    return;
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("audio/mpeg") && !contentType.includes("audio/")) {
    await fallbackBrowser();
    return;
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    await fallbackBrowser();
    return;
  }

  if (myToken !== speakToken) return;

  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;
  const audio = new Audio(objectUrl);
  currentAudio = audio;

  audio.onended = () => {
    if (myToken !== speakToken) return;
    stopAudioPlayback();
    args.onEnd?.();
  };

  audio.onerror = () => {
    if (myToken !== speakToken) return;
    stopAudioPlayback();
    void fallbackBrowser().catch(() => {
      args.onError?.("Could not finish reading. You can still read the story on the page.");
      args.onEnd?.();
    });
  };

  try {
    await audio.play();
  } catch {
    if (myToken !== speakToken) return;
    stopAudioPlayback();
    await fallbackBrowser();
    return;
  }

  if (myToken !== speakToken) return;
  args.onStart?.();
}
