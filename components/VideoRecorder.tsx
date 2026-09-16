"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 5 * 60;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export type RecordedVideo = {
  blob: Blob;
  file: File;
  url: string;
  mimeType: string;
  durationSeconds: number;
};

export function VideoRecorder({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: (video: RecordedVideo) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const facingRef = useRef<"user" | "environment">("user");

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"live" | "preview">("live");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>("video/webm");
  const [switching, setSwitching] = useState(false);

  async function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera(facing: "user" | "environment") {
    setError(null);
    await stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser does not support camera access. Upload a video instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      facingRef.current = facing;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera failed";
      if (/Permission|NotAllowed|denied/i.test(msg)) {
        setError(
          "Camera access was denied. Allow camera/mic in browser settings or upload a video instead.",
        );
      } else if (/NotFound|DevicesNotFound/i.test(msg)) {
        setError("No camera was found on this device. Upload a video instead.");
      } else {
        setError(`Could not open camera: ${msg}`);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    setPhase("live");
    setRecording(false);
    setSeconds(0);
    setPreviewBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    void startCamera("user");
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stop();
      void stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRecording() {
    setError(null);
    const stream = streamRef.current;
    if (!stream) {
      setError("Camera is not ready yet.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError(
        "This browser cannot record video in-app. Upload a video instead.",
      );
      return;
    }
    const mime = pickMimeType();
    chunksRef.current = [];
    try {
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      setMimeType(recorder.mimeType || mime || "video/webm");
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        clearTimer();
        setRecording(false);
        const type = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setPreviewBlob(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setPhase("preview");
        void stopStream();
      };
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not start recording: ${e.message}`
          : "Could not start recording.",
      );
    }
  }

  function stopRecording() {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function recordAgain() {
    setPhase("live");
    setPreviewBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSeconds(0);
    await startCamera(facingRef.current);
  }

  async function switchCamera() {
    if (recording || switching) return;
    setSwitching(true);
    const next = facingRef.current === "user" ? "environment" : "user";
    await startCamera(next);
    setSwitching(false);
  }

  function accept() {
    if (!previewBlob || !previewUrl) return;
    const ext = previewBlob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File(
      [previewBlob],
      `recorded-story-${Date.now()}.${ext}`,
      { type: previewBlob.type || mimeType },
    );
    onAccept({
      blob: previewBlob,
      file,
      url: previewUrl,
      mimeType: previewBlob.type || mimeType,
      durationSeconds: seconds,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6">
      <div className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/15 bg-[#0b0b0c] p-4 shadow-2xl md:max-w-xl md:p-6 lg:max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-orange-300">
            {phase === "live" ? "Record Your Story" : "Preview Your Story"}
          </h2>
          <button
            type="button"
            onClick={() => {
              stopRecording();
              void stopStream();
              onClose();
            }}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-zinc-300"
          >
            Close
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        {phase === "live" ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="aspect-[3/4] w-full object-cover"
              />
              <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                {recording ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    {formatTime(seconds)} / {formatTime(MAX_SECONDS)}
                  </span>
                ) : (
                  "Live"
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={recording || switching}
              onClick={() => void switchCamera()}
              className="w-full rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200 disabled:opacity-50"
            >
              Switch Camera
            </button>

            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wide text-black"
              >
                Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="w-full rounded-2xl bg-red-500 py-3.5 text-sm font-black uppercase tracking-wide text-white"
              >
                Stop Recording
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                playsInline
                className="aspect-[3/4] w-full rounded-2xl bg-black object-contain"
              />
            )}
            <p className="text-center text-xs text-zinc-500">
              Duration {formatTime(seconds)} · Max {formatTime(MAX_SECONDS)}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void recordAgain()}
                className="rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200"
              >
                Record Again
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-2xl bg-orange-500 py-3 text-sm font-black uppercase text-black"
              >
                Use This Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
