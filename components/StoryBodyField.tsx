"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  isVoiceTypingSupported,
  startVoiceTyping,
  type VoiceTypingSession,
} from "@/lib/voice-typing";

export function StoryBodyField({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
}) {
  const fieldId = useId();
  const statusId = useId();
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const sessionRef = useRef<VoiceTypingSession | null>(null);
  const valueRef = useRef(value);
  const committedRef = useRef(value);
  const fromSpeechRef = useRef(false);

  useEffect(() => {
    if (!fromSpeechRef.current) {
      committedRef.current = value;
    }
    fromSpeechRef.current = false;
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    void isVoiceTypingSupported().then((ok) => {
      if (!cancelled) setSupported(ok);
    });
    return () => {
      cancelled = true;
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.stop();
    };
  }, []);

  const statusHint = useMemo(() => {
    if (!supported) {
      return "Voice typing isn't supported here. You can type your story normally.";
    }
    if (listening) return "Listening... tap Stop when you're done.";
    return "Optional if you attach video or evidence.";
  }, [supported, listening]);

  async function stopListening() {
    const session = sessionRef.current;
    sessionRef.current = null;
    setListening(false);
    if (session) {
      try {
        await session.stop();
      } catch {
        /* ignore */
      }
    }
  }

  async function startListening() {
    setSpeechError(null);
    committedRef.current = valueRef.current;

    try {
      const session = await startVoiceTyping({
        getCommitted: () => committedRef.current,
        setCommitted: (next) => {
          committedRef.current = next;
        },
        maxLength,
        callbacks: {
          onText: (next) => {
            fromSpeechRef.current = true;
            valueRef.current = next;
            onChange(next);
          },
          onError: (message) => {
            setSpeechError(message);
            setListening(false);
            sessionRef.current = null;
          },
          onEnd: () => {
            setListening(false);
            sessionRef.current = null;
          },
        },
      });
      sessionRef.current = session;
      setListening(true);
    } catch (e) {
      console.error("[last-storyteller voice typing]", e);
      setSpeechError("Could not start voice typing. You can type normally.");
      setListening(false);
      sessionRef.current = null;
    }
  }

  function toggleMic() {
    if (listening) void stopListening();
    else void startListening();
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="block text-center text-xs font-bold uppercase tracking-wide text-zinc-400"
      >
        Your story
      </label>
      <div className="relative">
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          maxLength={maxLength}
          placeholder="Type your story, or tap the microphone to tell it..."
          aria-describedby={statusId}
          aria-label="Story text. Type, or tap the microphone to dictate."
          className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pb-14 text-left leading-relaxed text-white outline-none ring-orange-400/40 placeholder:text-zinc-600 focus:ring-2"
        />
        {supported ? (
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={
              listening
                ? "Stop voice typing"
                : "Start voice typing with the microphone"
            }
            className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide shadow-lg ${
              listening
                ? "bg-rose-500 text-white ring-2 ring-rose-300/70"
                : "bg-orange-500 text-black hover:bg-orange-400"
            }`}
          >
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${
                listening ? "animate-pulse bg-white" : "bg-black"
              }`}
            />
            {listening ? "Stop" : "Mic"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Voice typing is not supported here"
            title="Voice typing isn't supported here"
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-500"
          >
            Mic
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={
            speechError
              ? "font-semibold text-amber-200"
              : listening
                ? "font-semibold text-rose-200"
                : ""
          }
        >
          {speechError ?? statusHint}
        </p>
        <p>
          {value.trim().length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
