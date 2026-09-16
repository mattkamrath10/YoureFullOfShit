import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getOpenAiVoice } from "@/lib/narrators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 4000;
const DEFAULT_MODEL = "tts-1-hd";
const ttsCache = new Map<string, { body: ArrayBuffer; at: number }>();
const TTS_CACHE_MAX = 50;
const TTS_CACHE_MS = 6 * 60 * 60 * 1000;

type NarrateBody = {
  text?: unknown;
  narratorId?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "OpenAI TTS is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let payload: NarrateBody;
  try {
    payload = (await request.json()) as NarrateBody;
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Expected JSON body with text and narratorId." },
      { status: 400 },
    );
  }

  const rawText = typeof payload.text === "string" ? payload.text : "";
  const text = rawText.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!text) {
    return NextResponse.json(
      { error: "bad_request", message: "Text is required." },
      { status: 400 },
    );
  }

  const narratorId =
    typeof payload.narratorId === "string" ? payload.narratorId : "";
  const voice = getOpenAiVoice(narratorId);
  const model = process.env.OPENAI_TTS_MODEL?.trim() || DEFAULT_MODEL;
  const cacheKey = createHash("sha256").update(`${model}:${voice}:${text}`).digest("hex");
  const cached = ttsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTS_CACHE_MS) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "X-TTS-Cache": "hit",
      },
    });
  }

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: "mp3",
      }),
    });
  } catch {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message: "Could not reach the voice service. Try again in a moment.",
      },
      { status: 502 },
    );
  }

  if (!openaiResponse.ok) {
    // Do not forward upstream body (may contain request details). Friendly 502 only.
    return NextResponse.json(
      {
        error: "upstream_error",
        message: "The voice service could not read this story right now. Try again later.",
      },
      { status: 502 },
    );
  }

  const audioBuffer = await openaiResponse.arrayBuffer();
  ttsCache.set(cacheKey, { body: audioBuffer, at: Date.now() });
  if (ttsCache.size > TTS_CACHE_MAX) {
    const first = ttsCache.keys().next().value;
    if (first) ttsCache.delete(first);
  }
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
      "X-TTS-Cache": "miss",
    },
  });
}
