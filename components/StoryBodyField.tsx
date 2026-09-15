"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  appendTranscript,
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speech";

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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const committedRef = useRef(value);
  const fromSpeechRef = useRef(false);
  const intentionalStop = useRef(false);

  useEffect(() => {
    if (!fromSpeechRef.current) {
      committedRef.current = value;
    }
    fromSpeechRef.current = false;
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      intentionalStop.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const statusHint = useMemo(() => {
    if (!supported) {
      return "Voice typing isn’t supported in this browser. You can type your story normally.";
    }
    if (listening) return "Listening… tap Stop when you’re done.";
    return "Optional if you attach video or evidence.";
  }, [supported, listening]);

  function stopListening() {
    intentionalStop.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Voice typing isn’t supported in this browser. You can type your story normally.",
      );
      return;
    }
    setSpeechError(null);
    intentionalStop.current = false;
    committedRef.current = valueRef.current;

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finals = "";
      let interims = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finals += piece;
        else interims += piece;
      }

      if (finals.trim()) {
        const next = appendTranscript(committedRef.current, finals).slice(
          0,
          maxLength,
        );
        committedRef.current = next;
        fromSpeechRef.current = true;
        valueRef.current = next;
        onChange(next);
        return;
      }

      if (interims.trim()) {
        const preview = appendTranscript(committedRef.current, interims).slice(
          0,
          maxLength,
        );
        fromSpeechRef.current = true;
        valueRef.current = preview;
        onChange(preview);
      }
    };

    recognition.onerror = (event) => {
      console.error("[last-storyteller speech]", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechError("Microphone access was denied. You can still type your story.");
      } else if (event.error === "no-speech") {
        setSpeechError("No speech detected. Tap the microphone and try again.");
      } else if (event.error !== "aborted") {
        setSpeechError("Voice typing had a problem. You can keep typing normally.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      console.error("[last-storyteller speech start]", e);
      setSpeechError("Could not start voice typing. You can type normally.");
      setListening(false);
    }
  }

  function toggleMic() {
    if (listening) stopListening();
    else startListening();
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
            aria-label="Voice typing is not supported in this browser"
            title="Voice typing isn’t supported in this browser"
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
