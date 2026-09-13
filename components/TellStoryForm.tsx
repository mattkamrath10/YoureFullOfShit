"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInPrompt } from "@/components/social/SignInPrompt";
import { submitStory } from "@/lib/submit-story";
import {
  formatBytes,
  validateMediaFile,
  detectMediaType,
  shouldUseR2ForVideo,
  R2_VIDEO_APP_MAX,
  type SelectedMedia,
  type MediaUploadProgress,
} from "@/lib/media";

import { VideoRecorder, type RecordedVideo } from "@/components/VideoRecorder";
import { StoryBodyField } from "@/components/StoryBodyField";
import type { Category } from "@/types/database";

const TITLE_MAX = 120;
const BODY_MAX = 20000;

export function TellStoryForm({ categories }: { categories: Category[] }) {
  const { isSignedIn, loading: authLoading } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [recorded, setRecorded] = useState<RecordedVideo | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [processLabel, setProcessLabel] = useState<string | null>(null);
  const [uploadRatio, setUploadRatio] = useState<number | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uploadAbortRef = useRef<AbortController | null>(null);

  const canUploadMedia = Boolean(isSignedIn) && !authLoading;

  function requireMediaAccount(): boolean {
    if (authLoading) return false;
    if (!isSignedIn) {
      setMediaError("Sign in to upload video/audio");
      setPromptOpen(true);
      return false;
    }
    return true;
  }


  const bodyCount = body.trim().length;
  const titleCount = title.trim().length;

  const allMedia: SelectedMedia[] = useMemo(() => {
    const list = [...media];
    if (recorded) {
      list.unshift({
        id: `recorded-${recorded.file.name}`,
        file: recorded.file,
        mediaType: "video",
      });
    }
    return list;
  }, [media, recorded]);

  const submitHints = useMemo(() => {
    const hints: string[] = [];
    if (!title.trim()) hints.push("Add a title.");
    else if (titleCount > TITLE_MAX) hints.push("Title is too long.");
    if (!categoryId) hints.push("Select a category.");
    if (bodyCount > BODY_MAX) hints.push("Story is too long.");
    if (bodyCount === 0 && allMedia.length === 0) {
      hints.push("Add a story (type or speak) or attach a video/photo/document.");
    }
    if (!isAnonymous && !displayName.trim()) {
      hints.push('Enter a display name, or choose "Post anonymously".');
    }
    return hints;
  }, [title, titleCount, categoryId, bodyCount, allMedia.length, isAnonymous, displayName]);

  const canSubmit = useMemo(() => {
    if (pending) return false;
    return submitHints.length === 0;
  }, [pending, submitHints]);

  async function prepareAndAddVideo(file: File) {
    if (!requireMediaAccount()) return;
    const mediaType = detectMediaType(file);
    if (mediaType !== "video") {
      const result = validateMediaFile(file);
      if (!result.ok) {
        setMediaError(result.error);
        return;
      }
      setMedia((prev) => {
        const duplicate = prev.some(
          (m) => m.file.name === file.name && m.file.size === file.size,
        );
        if (duplicate) return prev;
        return [
          ...prev,
          {
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
            file,
            mediaType: result.mediaType,
          },
        ];
      });
      return;
    }

    if (file.size > R2_VIDEO_APP_MAX) {
      setMediaError(
        "This video is too large (over 1 GB). Please choose a shorter clip.",
      );
      return;
    }

    const result = validateMediaFile(file);
    if (!result.ok) {
      setMediaError(result.error);
      return;
    }

    setMedia((prev) => [
      ...prev,
      {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        mediaType: "video",
      },
    ]);

    if (shouldUseR2ForVideo(file)) {
      setProcessLabel(
        `Large video selected (${formatBytes(file.size)}). It will upload securely on submit (no compression/split).`,
      );
    }
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    if (!requireMediaAccount()) return;
    setMediaError(null);
    void (async () => {
      for (const file of Array.from(fileList)) {
        await prepareAndAddVideo(file);
      }
    })();
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploadLabel(null);
    setUploadRatio(null);
    setMediaError(null);
    if (!isSignedIn && allMedia.length > 0) {
      setMediaError("Sign in to upload video/audio");
      setPromptOpen(true);
      setError("Sign in to upload video/audio");
      return;
    }
    for (const item of allMedia) {
      const check = validateMediaFile(item.file);
      if (!check.ok) {
        setMediaError(check.error);
        setError(check.error);
        return;
      }
    }
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    startTransition(async () => {
      try {
        const id = await submitStory({
          title,
          categoryId,
          body,
          isAnonymous,
          displayName,
          media: allMedia,
          signal: controller.signal,
          onUploadProgress: (p: MediaUploadProgress) => {
            setUploadLabel(p.message ?? `Uploading ${p.done}/${p.total}: ${p.currentName}`);
            setUploadRatio(typeof p.ratio === "number" ? p.ratio : null);
          },
        });
        setSubmittedId(id);
        setUploadRatio(1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Upload cancelled.");
        } else {
          setError(err instanceof Error ? err.message : "Your story could not be submitted. Please try again.");
        }
        setUploadLabel(null);
        setUploadRatio(null);
      } finally {
        uploadAbortRef.current = null;
      }
    });
  }

  function cancelUpload() {
    uploadAbortRef.current?.abort();
    setUploadLabel("Cancelling upload…");
  }

  if (submittedId) {
    return (
      <div className="space-y-6 rounded-3xl border border-orange-400/30 bg-zinc-900/70 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Submitted
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Story submitted.
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
          Your story is in the review queue. It will{" "}
          <span className="text-zinc-200">not</span> appear on Discover until
          published.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-black"
          >
            Back to Discover
          </Link>
          <Link
            href="/my-stories"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-200"
          >
            My Stories
          </Link>
          <Link
            href={`/story/${submittedId}`}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-200"
          >
            View my submission
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
            Tell Your Story
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Everybody has a story.
          </h1>
          <p className="mx-auto max-w-xl text-sm text-zinc-400">
            Type or speak it. Record video separately. Add evidence if you want.
            The community decides what they believe.
          </p>
        </section>

        <div className="space-y-5 rounded-3xl border border-white/10 bg-zinc-900/70 p-4 sm:p-7">
          <label className="block space-y-2">
            <span className="block text-center text-xs font-bold uppercase tracking-wide text-zinc-400">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Give it a punchy title"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-orange-400/40 placeholder:text-zinc-600 focus:ring-2"
            />
            <p className="text-right text-xs text-zinc-500">
              {titleCount}/{TITLE_MAX}
            </p>
          </label>

          <label className="block space-y-2">
            <span className="block text-center text-xs font-bold uppercase tracking-wide text-zinc-400">
              Category
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-orange-400/40 focus:ring-2"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <StoryBodyField
            value={body}
            onChange={setBody}
            maxLength={BODY_MAX}
          />

          <fieldset className="space-y-3">
            <legend className="w-full text-center text-xs font-bold uppercase tracking-wide text-zinc-400">
              Identity
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                  isAnonymous
                    ? "border-orange-300 bg-orange-500 text-black"
                    : "border-white/10 bg-white/5 text-zinc-200"
                }`}
              >
                Post anonymously
              </button>
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                  !isAnonymous
                    ? "border-orange-300 bg-orange-500 text-black"
                    : "border-white/10 bg-white/5 text-zinc-200"
                }`}
              >
                Show my name
              </button>
            </div>
            {!isAnonymous && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Display name"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-orange-400/40 placeholder:text-zinc-600 focus:ring-2"
              />
            )}
          </fieldset>

          <section className="space-y-3 rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4">
            <div className="text-center">
              <h2 className="text-sm font-black uppercase tracking-wide text-orange-300">
                Record Video Story
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Separate from typing/speaking above. Record video evidence. Max 5
                minutes. Large recordings upload securely on submit (no compression).
              </p>
            </div>
            {recorded ? (
              <div className="space-y-3">
                <video
                  src={recorded.url}
                  controls
                  playsInline
                  className="w-full rounded-2xl bg-black"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(recorded.url);
                      setRecorded(null);
                      setRecorderOpen(true);
                    }}
                    className="rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200"
                  >
                    Record Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(recorded.url);
                      setRecorded(null);
                    }}
                    className="rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200"
                  >
                    Remove Recording
                  </button>
                </div>
              </div>
            ) : canUploadMedia ? (
              <button
                type="button"
                onClick={() => setRecorderOpen(true)}
                className="w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wide text-black"
              >
                Record Video Story
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMediaError("Sign in to upload video/audio");
                  setPromptOpen(true);
                }}
                className="w-full rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-black uppercase tracking-wide text-zinc-200"
              >
                Sign in to upload video/audio
              </button>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-black/20 p-4">
            <div className="text-center">
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">
                Add Evidence
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Upload photos, videos, or documents you already have. Optional.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Images ≤ 10 MB · Videos ≤ 50 MB via Supabase · Larger videos (up to 1 GB) upload via R2 · PDFs ≤ 20 MB
              </p>
              {!canUploadMedia && (
                <p className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Sign in to upload video/audio. Guests can still submit text (and speech-to-text).
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label onClick={(e) => { if (!canUploadMedia) { e.preventDefault(); requireMediaAccount(); } }} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center hover:bg-black/50">
                <span className="text-sm font-bold text-white">Take Photo</span>
                <span className="mt-1 text-[11px] text-zinc-500">Camera still</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label onClick={(e) => { if (!canUploadMedia) { e.preventDefault(); requireMediaAccount(); } }} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center hover:bg-black/50">
                <span className="text-sm font-bold text-white">Choose Photos</span>
                <span className="mt-1 text-[11px] text-zinc-500">From gallery</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label onClick={(e) => { if (!canUploadMedia) { e.preventDefault(); requireMediaAccount(); } }} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center hover:bg-black/50">
                <span className="text-sm font-bold text-white">Upload Video</span>
                <span className="mt-1 text-[11px] text-zinc-500">Existing file</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <label onClick={(e) => { if (!canUploadMedia) { e.preventDefault(); requireMediaAccount(); } }} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center hover:bg-black/50">
              <span className="text-sm font-bold text-white">Upload documents / mixed files</span>
              <span className="mt-1 text-xs text-zinc-500">
                JPG, PNG, WEBP, MP4, MOV, WEBM, PDF
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.pdf"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {mediaError && (
              <p className="text-center text-sm text-red-300" role="alert">
                {mediaError}
              </p>
            )}

            {media.length > 0 && (
              <ul className="space-y-2">
                {media.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {m.file.name}
                      </p>
                      <p className="text-xs uppercase text-zinc-500">
                        {m.mediaType} · {formatBytes(m.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(m.id)}
                      className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-zinc-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {processLabel && !pending && (
            <p className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-center text-sm text-orange-100">
              {processLabel}
            </p>
          )}

          {(uploadLabel || pending) && (
            <div className="space-y-2 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-orange-200">
                {uploadLabel ?? "Uploading…"}
              </p>
              {typeof uploadRatio === "number" && (
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full bg-orange-400 transition-all"
                    style={{ width: `${Math.round(uploadRatio * 100)}%` }}
                  />
                </div>
              )}
              {pending && (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold uppercase text-zinc-200"
                >
                  Cancel upload
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          {!canSubmit && !pending && submitHints.length > 0 && (
            <ul className="space-y-1 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100" role="status">
              {submitHints.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Submitting..." : "Submit Story"}
          </button>
        </div>
      </form>

      <VideoRecorder
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onAccept={(video) => {
          setRecorderOpen(false);
          void (async () => {
            if (!requireMediaAccount()) return;
            const check = validateMediaFile(video.file);
            if (!check.ok) {
              setMediaError(check.error);
              setError(check.error);
              return;
            }
            if (shouldUseR2ForVideo(video.file)) {
              setRecorded(null);
              await prepareAndAddVideo(video.file);
              return;
            }
            setMediaError(null);
            setRecorded(video);
          })();
        }}
      />

      <SignInPrompt
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        action="upload media"
      />
    </>
  );
}
