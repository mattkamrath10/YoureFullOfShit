"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ModerationActions } from "@/components/ModerationActions";
import { StoryDeleteButton } from "@/components/StoryDeleteButton";
import {
  getStoryType,
  getStoryTypeLabel,
  STORY_TYPE_BADGE_CLASS,
  type StoryType,
} from "@/lib/story-type";
import {
  listModerationComments,
  setCommentStatus,
  type AdminComment,
} from "@/lib/social/comments-admin";
import { STATUS_LABELS, type Story, type StoryStatus } from "@/types/database";
import { AdminPlusPanel } from "@/components/admin/AdminPlusPanel";

type SectionId = "stories" | "comments" | "plus";
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
  highlightStoryId = null,
}: {
  initialStories: Story[];
  /** From ?story= — deep link from admin notification email. */
  highlightStoryId?: string | null;
}) {
  const [section, setSection] = useState<SectionId>("stories");
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | StoryType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StoryStatus>("all");

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  useEffect(() => {
    if (!highlightStoryId) return;
    setSection("stories");
    setTab("pending");
    const t = window.setTimeout(() => {
      document
        .getElementById(`mod-story-${highlightStoryId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlightStoryId]);

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

  function onStoryDeleted(storyId: string) {
    setStories((prev) => prev.filter((story) => story.id !== storyId));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setSection("stories")}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
            section === "stories"
              ? "bg-orange-500 text-black"
              : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
          }`}
        >
          Stories
        </button>
        <button
          type="button"
          onClick={() => setSection("comments")}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
            section === "comments"
              ? "bg-orange-500 text-black"
              : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
          }`}
        >
          Comments
        </button>
        <button
          type="button"
          onClick={() => setSection("plus")}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
            section === "plus"
              ? "bg-orange-500 text-black"
              : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
          }`}
        >
          Plus
        </button>
      </div>
      <p className="text-center text-xs text-zinc-500">
        Full grant tools also live at{" "}
        <Link href="/admin/plus" className="text-orange-300">
          /admin/plus
        </Link>
        .
      </p>

      {section === "comments" ? (
        <CommentsModerationPanel />
      ) : section === "plus" ? (
        <AdminPlusPanel />
      ) : (
        <>
          {counts.pending > 0 ? (
            <div
              className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-center shadow-[0_0_28px_rgba(244,63,94,0.15)]"
              role="status"
            >
              <p className="text-sm font-black uppercase tracking-wide text-rose-200 sm:text-base">
                🔴 {counts.pending}{" "}
                {counts.pending === 1
                  ? "STORY WAITING FOR REVIEW"
                  : "STORIES WAITING FOR REVIEW"}
              </p>
              <p className="mt-1 text-xs text-rose-200/70">
                Approve to publish on Discover, or reject to keep it private.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
              Queue clear — no stories waiting for review
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <CountTile label="Pending" value={counts.pending} accent="orange" />
            <CountTile
              label="Approved"
              value={counts.approved}
              accent="emerald"
            />
            <CountTile
              label="Rejected"
              value={counts.rejected}
              accent="rose"
            />
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
                  highlighted={highlightStoryId === story.id}
                  onStatusChange={onStatusChange}
                  onStoryDeleted={onStoryDeleted}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CommentsModerationPanel() {
  const [rows, setRows] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "reported" | "removed" | "pending">(
    "all",
  );

  async function reload() {
    setError(null);
    const data = await listModerationComments();
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listModerationComments()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load comments.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    return rows.filter((c) => {
      const reportCount = c.story_comment_reports?.length ?? 0;
      if (filter === "reported") return reportCount > 0;
      if (filter === "removed") return c.status === "removed";
      if (filter === "pending") return c.status === "pending";
      return true;
    });
  }, [rows, filter]);

  function onSetStatus(id: string, status: "visible" | "removed" | "pending") {
    startTransition(async () => {
      try {
        await setCommentStatus(id, status);
        setRows((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c)),
        );
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-zinc-400">
        Review reported, pending, or removed comments. Story approve/reject is
        unchanged on the Stories tab.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            ["all", "All"],
            ["reported", "Reported"],
            ["pending", "Pending"],
            ["removed", "Removed"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
              filter === id
                ? "bg-orange-500 text-black"
                : "border border-white/10 bg-white/5 text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm text-zinc-500">Loading comments…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
          No comments in this queue.
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((c) => {
            const name =
              c.profiles?.display_name?.trim() ||
              c.profiles?.username?.trim() ||
              "Member";
            const reports = c.story_comment_reports?.length ?? 0;
            const storyTitle =
              (c as AdminComment & { stories?: { title?: string } }).stories
                ?.title ?? "Story";
            return (
              <article
                key={c.id}
                className="rounded-3xl border border-white/10 bg-zinc-900/70 p-4"
              >
                <div className="mb-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                  <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1 text-orange-200">
                    {c.status}
                  </span>
                  {reports > 0 && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                      {reports} report{reports === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="text-center text-xs text-zinc-500">
                  {name} · {formatWhen(c.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-center text-sm text-zinc-200">
                  {c.body}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Link
                    href={`/story/${c.story_id}`}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-100"
                  >
                    Open story · {storyTitle.slice(0, 40)}
                    {storyTitle.length > 40 ? "…" : ""}
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    disabled={pending || c.status === "visible"}
                    onClick={() => onSetStatus(c.id, "visible")}
                    className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    disabled={pending || c.status === "removed"}
                    onClick={() => onSetStatus(c.id, "removed")}
                    className="rounded-full bg-rose-500/90 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    disabled={pending || c.status === "pending"}
                    onClick={() => onSetStatus(c.id, "pending")}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-100 disabled:opacity-50"
                  >
                    Mark pending
                  </button>
                </div>
              </article>
            );
          })}
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
  highlighted = false,
  onStatusChange,
  onStoryDeleted,
}: {
  story: Story;
  showModeratedMeta: boolean;
  highlighted?: boolean;
  onStatusChange: (
    storyId: string,
    next: "published" | "rejected" | "pending",
  ) => void;
  onStoryDeleted: (storyId: string) => void;
}) {
  const status = (story.status ?? "pending") as StoryStatus;
  const flags = mediaFlags(story);
  const storyType = getStoryType(story.story_media);
  const storyTypeLabel = getStoryTypeLabel(story.story_media);
  const author = authorLabel(story);
  const submitted = formatWhen(story.created_at);
  const updated = formatWhen(story.updated_at);

  return (
    <article
      id={`mod-story-${story.id}`}
      className={`relative rounded-3xl border p-4 ${
        highlighted
          ? "border-orange-400/60 bg-orange-500/10 shadow-[0_0_32px_rgba(249,115,22,0.2)]"
          : "border-white/10 bg-zinc-900/70"
      }`}
    >
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
      <div className="mt-3 flex justify-center">
        <StoryDeleteButton
          storyId={story.id}
          onDeleted={() => onStoryDeleted(story.id)}
        />
      </div>
    </article>
  );
}
