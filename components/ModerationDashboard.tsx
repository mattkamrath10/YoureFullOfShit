"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModerationActions } from "@/components/ModerationActions";
import {
  getStoryType,
  getStoryTypeLabel,
  STORY_TYPE_BADGE_CLASS,
  type StoryType,
} from "@/lib/story-type";
import { STATUS_LABELS, type Story, type StoryStatus } from "@/types/database";

type TabId = "pending" | "approved" | "rejected" | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function mediaFlags(story: Story) {
  const media = story.story_media ?? [];
  return {
    video: media.some((m) => {
      const t = (m.media_type ?? "").toLowerCase();
      const mime = (m.mime_type ?? "").toLowerCase();
      return t === "video" || mime.startsWith("video/");
    }),
    audio: media.some((m) => {
      const t = (m.media_type ?? "").toLowerCase();
      const mime = (m.mime_type ?? "").toLowerCase();
      return t === "audio" || mime.startsWith("audio/");
    }),
    photos: media.some((m) => m.media_type === "image"),
    docs: media.some((m) => m.media_type === "document"),
  };
}

function authorLabel(story: Story): string {
  if (story.is_anonymous) return "Anonymous";
  return story.profiles?.display_name ?? "Named author";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ModerationDashboard({
  initialStories,
}: {
  initialStories: Story[];
}) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | StoryType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StoryStatus>("all");

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  const counts = useMemo(
    () => ({
      pending: stories.filter((s) => s.status === "pending").length,
      approved: stories.filter((s) => s.status === "published").length,
      rejected: stories.filter((s) => s.status === "rejected").length,
      all: stories.length,
    }),
    [stories],
  );

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const s of stories) {
      const n = s.categories?.name;
      if (n) names.add(n);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [stories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => {
      if (tab === "pending" && story.status !== "pending") return false;
      if (tab === "approved" && story.status !== "published") return false;
      if (tab === "rejected" && story.status !== "rejected") return false;

      if (statusFilter !== "all" && story.status !== statusFilter) return false;

      const st = getStoryType(story.story_media);
      if (typeFilter !== "all" && st !== typeFilter) return false;

      const cat = story.categories?.name ?? "Uncategorized";
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;

      if (q) {
        const hay = [
          story.title,
          authorLabel(story),
          cat,
          getStoryTypeLabel(story.story_media),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stories, tab, query, typeFilter, categoryFilter, statusFilter]);

  function onStatusChange(
    storyId: string,
    next: "published" | "rejected" | "pending",
  ) {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? {
              ...s,
              status: next,
              is_published: next === "published",
              updated_at: new Date().toISOString(),
              rejection_reason:
                next === "rejected"
                  ? s.rejection_reason ?? "Not approved for Discover."
                  : null,
            }
          : s,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <CountTile label="Pending" value={counts.pending} accent="orange" />
        <CountTile label="Approved" value={counts.approved} accent="emerald" />
        <CountTile label="Rejected" value={counts.rejected} accent="rose" />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          const n =
            t.id === "pending"
              ? counts.pending
              : t.id === "approved"
                ? counts.approved
                : t.id === "rejected"
                  ? counts.rejected
                  : counts.all;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition sm:px-4 sm:text-xs ${
                active
                  ? "bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                  : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {t.label}
              <span
                className={
                  active ? "ml-1.5 opacity-80" : "ml-1.5 text-zinc-500"
                }
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-zinc-900/50 p-4">
        <label className="block">
          <span className="mb-1.5 block text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, author, or category"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-center text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | StoryStatus)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "published", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <FilterSelect
            label="Story type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as "all" | StoryType)}
            options={[
              { value: "all", label: "All types" },
              { value: "video", label: "Video story" },
              { value: "audio", label: "Audio story" },
              { value: "text", label: "Text story" },
            ]}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
          {tab === "pending"
            ? "Queue is clear — no stories waiting for review."
            : "No stories match these filters."}
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((story) => (
            <ModerationCard
              key={story.id}
              story={story}
              showModeratedMeta={tab !== "pending"}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CountTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "orange" | "emerald" | "rose";
}) {
  const ring =
    accent === "orange"
      ? "border-orange-400/30 text-orange-200"
      : accent === "emerald"
        ? "border-emerald-400/30 text-emerald-200"
        : "border-rose-400/30 text-rose-200";
  return (
    <div
      className={`rounded-2xl border bg-zinc-900/70 px-3 py-3 text-center sm:px-4 ${ring}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-center text-sm text-zinc-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModerationCard({
  story,
  showModeratedMeta,
  onStatusChange,
}: {
  story: Story;
  showModeratedMeta: boolean;
  onStatusChange: (
    storyId: string,
    next: "published" | "rejected" | "pending",
  ) => void;
}) {
  const status = (story.status ?? "pending") as StoryStatus;
  const flags = mediaFlags(story);
  const storyType = getStoryType(story.story_media);
  const storyTypeLabel = getStoryTypeLabel(story.story_media);
  const author = authorLabel(story);
  const submitted = formatWhen(story.created_at);
  const updated = formatWhen(story.updated_at);

  return (
    <article className="relative rounded-3xl border border-white/10 bg-zinc-900/70 p-4">
      <span
        className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STORY_TYPE_BADGE_CLASS[storyType]}`}
      >
        {storyTypeLabel}
      </span>

      <div className="mb-2 flex flex-wrap justify-center gap-2 pr-24 text-[11px] font-semibold uppercase tracking-wide">
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-200">
          {story.categories?.name ?? "Uncategorized"}
        </span>
        <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1 text-orange-200">
          {STATUS_LABELS[status]}
        </span>
        {story.is_anonymous && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-400">
            Anonymous
          </span>
        )}
      </div>

      <h3 className="text-center text-lg font-black text-white">{story.title}</h3>
      <p className="mt-1 text-center text-xs text-zinc-400">
        {author} · Submitted {submitted}
      </p>
      {showModeratedMeta && (
        <p className="mt-1 text-center text-[11px] text-zinc-500">
          Last updated {updated}
        </p>
      )}
      <p className="mt-2 text-center text-xs text-zinc-500">
        Video: {flags.video ? "Yes" : "No"} · Audio:{" "}
        {flags.audio ? "Yes" : "No"} · Photos: {flags.photos ? "Yes" : "No"} ·
        Docs: {flags.docs ? "Yes" : "No"}
      </p>

      <div className="mt-3 flex justify-center">
        <Link
          href={`/story/${story.id}`}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-100"
        >
          Open Story
        </Link>
      </div>

      <ModerationActions
        storyId={story.id}
        status={status}
        onStatusChange={onStatusChange}
      />
    </article>
  );
}
