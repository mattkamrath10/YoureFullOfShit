"use client";

/**
 * Voice typing for Tell Your Story.
 * Browser: Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Capacitor iOS/Android shell: native SFSpeechRecognizer via Capgo plugin.
 * Do not rely on Web Speech inside WKWebView -- it is not reliably available there.
 */

import {
  appendTranscript,
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speech";
import { isNativeShellWindow } from "@/lib/native/platform";

export type VoiceTypingSession = {
  stop: () => Promise<void>;
};

export type VoiceTypingCallbacks = {
  /** Full field text after applying this recognition update. */
  onText: (next: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

export async function isVoiceTypingSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativeShellWindow()) {
    try {
      const { SpeechRecognition } = await import(
        "@capgo/capacitor-speech-recognition"
      );
      const { available } = await SpeechRecognition.available();
      return Boolean(available);
    } catch {
      return false;
    }
  }

  return Boolean(getSpeechRecognitionCtor());
}

export async function startVoiceTyping(args: {
  getCommitted: () => string;
  setCommitted: (next: string) => void;
  maxLength: number;
  callbacks: VoiceTypingCallbacks;
}): Promise<VoiceTypingSession> {
  if (isNativeShellWindow()) {
    return startNative(args);
  }
  return startWeb(args);
}

async function startNative(args: {
  getCommitted: () => string;
  setCommitted: (next: string) => void;
  maxLength: number;
  callbacks: VoiceTypingCallbacks;
}): Promise<VoiceTypingSession> {
  const { SpeechRecognition } = await import(
    "@capgo/capacitor-speech-recognition"
  );

  const perm = await SpeechRecognition.requestPermissions();
  if (perm.speechRecognition !== "granted") {
    args.callbacks.onError(
      "Microphone or speech recognition permission was denied. You can still type your story.",
    );
    args.callbacks.onEnd();
    return { stop: async () => undefined };
  }

  const { available } = await SpeechRecognition.available();
  if (!available) {
    args.callbacks.onError(
      "Voice typing is not available on this device. You can type your story normally.",
    );
    args.callbacks.onEnd();
    return { stop: async () => undefined };
  }

  let stopped = false;
  const handles: Array<{ remove: () => Promise<void> }> = [];

  const partialHandle = await SpeechRecognition.addListener(
    "partialResults",
    (event) => {
      if (stopped) return;
      const spoken = (event.matches?.[0] ?? "").trim();
      if (!spoken) return;
      // Native partials are usually the full current utterance, not a delta.
      const next = appendTranscript(args.getCommitted(), spoken).slice(
        0,
        args.maxLength,
      );
      args.callbacks.onText(next);
    },
  );
  handles.push(partialHandle);

  const errorHandle = await SpeechRecognition.addListener("error", (event) => {
    if (stopped) return;
    console.error("[last-storyteller native speech]", event.code, event.message);
    args.callbacks.onError(
      "Voice typing had a problem. You can keep typing normally.",
    );
  });
  handles.push(errorHandle);

  const stateHandle = await SpeechRecognition.addListener(
    "listeningState",
    (event) => {
      if (stopped) return;
      if (event.status === "stopped" || event.state === "stopped") {
        args.callbacks.onEnd();
      }
    },
  );
  handles.push(stateHandle);

  try {
    await SpeechRecognition.start({
      language: "en-US",
      maxResults: 3,
      partialResults: true,
      popup: false,
      addPunctuation: true,
    });
  } catch (e) {
    console.error("[last-storyteller native speech start]", e);
    for (const h of handles) {
      try {
        await h.remove();
      } catch {
        /* ignore */
      }
    }
    args.callbacks.onError(
      "Could not start voice typing. You can type normally.",
    );
    args.callbacks.onEnd();
    return { stop: async () => undefined };
  }

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try {
        await SpeechRecognition.stop();
      } catch {
        try {
          await SpeechRecognition.forceStop();
        } catch {
          /* ignore */
        }
      }
      for (const h of handles) {
        try {
          await h.remove();
        } catch {
          /* ignore */
        }
      }
      // Commit the last previewed utterance when the user stops.
      // (partial listener already updated the field text)
      args.callbacks.onEnd();
    },
  };
}

async function startWeb(args: {
  getCommitted: () => string;
  setCommitted: (next: string) => void;
  maxLength: number;
  callbacks: VoiceTypingCallbacks;
}): Promise<VoiceTypingSession> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    args.callbacks.onError(
      "Voice typing isn't supported in this browser. You can type your story normally.",
    );
    args.callbacks.onEnd();
    return { stop: async () => undefined };
  }

  let recognition: SpeechRecognitionLike | null = null;
  let intentionalStop = false;

  try {
    recognition = new Ctor();
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
        const next = appendTranscript(args.getCommitted(), finals).slice(
          0,
          args.maxLength,
        );
        args.setCommitted(next);
        args.callbacks.onText(next);
        return;
      }

      if (interims.trim()) {
        const preview = appendTranscript(args.getCommitted(), interims).slice(
          0,
          args.maxLength,
        );
        args.callbacks.onText(preview);
      }
    };

    recognition.onerror = (event) => {
      console.error("[last-storyteller speech]", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        args.callbacks.onError(
          "Microphone access was denied. You can still type your story.",
        );
      } else if (event.error === "no-speech") {
        args.callbacks.onError(
          "No speech detected. Tap the microphone and try again.",
        );
      } else if (event.error !== "aborted") {
        args.callbacks.onError(
          "Voice typing had a problem. You can keep typing normally.",
        );
      }
      args.callbacks.onEnd();
    };

    recognition.onend = () => {
      if (!intentionalStop) {
        args.callbacks.onEnd();
      }
    };

    recognition.start();
  } catch (e) {
    console.error("[last-storyteller speech start]", e);
    args.callbacks.onError(
      "Could not start voice typing. You can type normally.",
    );
    args.callbacks.onEnd();
    return { stop: async () => undefined };
  }

  return {
    stop: async () => {
      intentionalStop = true;
      try {
        recognition?.stop();
      } catch {
        try {
          recognition?.abort();
        } catch {
          /* ignore */
        }
      }
      args.callbacks.onEnd();
    },
  };
}
