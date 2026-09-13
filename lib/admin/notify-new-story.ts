import "server-only";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site";
import {
  getStoryType,
  getStoryTypeLabel,
  type MediaLike,
} from "@/lib/story-type";

export type NotifyNewStoryResult =
  | { ok: true; skipped?: "duplicate" | "no_recipients" | "not_pending" }
  | { ok: false; error: string };

type StoryRow = {
  id: string;
  title: string;
  body: string | null;
  preview: string | null;
  status: string;
  is_anonymous: boolean;
  author_id: string | null;
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
  story_media:
    | (MediaLike & { media_type?: string | null; mime_type?: string | null })[]
    | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveAdminEmails(
  service: ReturnType<typeof createServiceClient>,
): Promise<string[]> {
  const emails = new Set<string>();

  const { data: admins, error } = await service
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  if (error) {
    console.error("[admin-notify] profiles.is_admin query failed", error);
  } else {
    for (const row of admins ?? []) {
      const id = row.id as string;
      try {
        const { data, error: userErr } =
          await service.auth.admin.getUserById(id);
        if (userErr) {
          console.error("[admin-notify] getUserById failed", id, userErr);
          continue;
        }
        const email = data.user?.email?.trim();
        if (email) emails.add(email);
      } catch (e) {
        console.error("[admin-notify] getUserById threw", id, e);
      }
    }
  }

  // Optional server-only fallback (comma-separated). Not NEXT_PUBLIC_. Not in client code.
  const fallback = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (fallback) {
    for (const part of fallback.split(",")) {
      const e = part.trim();
      if (e.includes("@")) emails.add(e);
    }
  }

  return Array.from(emails);
}

/**
 * Send one admin email for a newly pending story. Idempotent per story_id.
 * Never throws to callers for Resend/config issues — returns { ok:false }.
 */
export async function notifyAdminsOfNewStory(
  storyId: string,
): Promise<NotifyNewStoryResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error(
      "[admin-notify] RESEND_API_KEY or RESEND_FROM_EMAIL not configured; skipping email.",
    );
    return { ok: false, error: "resend_not_configured" };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (e) {
    console.error("[admin-notify] service client unavailable", e);
    return { ok: false, error: "service_role_missing" };
  }

  // Dedupe claim first (unique story_id). If already claimed, skip.
  const { error: claimErr } = await service
    .from("admin_story_notifications")
    .insert({
      story_id: storyId,
      channel: "email",
      status: "sending",
    });
  if (claimErr) {
    // Unique violation = already notified
    if (
      claimErr.code === "23505" ||
      /duplicate|unique/i.test(claimErr.message ?? "")
    ) {
      return { ok: true, skipped: "duplicate" };
    }
    console.error("[admin-notify] dedupe insert failed", claimErr);
    // Continue without hard fail — still try to email once
  }

  const { data: story, error: storyErr } = await service
    .from("stories")
    .select(
      "id, title, body, preview, status, is_anonymous, author_id, created_at, categories(name), profiles(display_name), story_media(media_type, mime_type)",
    )
    .eq("id", storyId)
    .maybeSingle();

  if (storyErr || !story) {
    console.error("[admin-notify] story load failed", storyErr);
    return { ok: false, error: "story_not_found" };
  }

  const row = story as unknown as StoryRow;
  if (row.status !== "pending") {
    return { ok: true, skipped: "not_pending" };
  }

  const recipients = await resolveAdminEmails(service);
  if (recipients.length === 0) {
    console.error(
      "[admin-notify] no admin emails resolved (profiles.is_admin + ADMIN_NOTIFY_EMAIL).",
    );
    await service
      .from("admin_story_notifications")
      .update({ status: "failed", error: "no_recipients" })
      .eq("story_id", storyId);
    return { ok: true, skipped: "no_recipients" };
  }

  const category =
    one(row.categories)?.name?.trim() || "Uncategorized";
  const submitter = row.is_anonymous
    ? "Anonymous"
    : one(row.profiles)?.display_name?.trim() || "Named author";
  const typeLabel = getStoryTypeLabel(row.story_media);
  const typeShort =
    getStoryType(row.story_media) === "video"
      ? "Video"
      : getStoryType(row.story_media) === "audio"
        ? "Audio"
        : "Text";
  const when = (() => {
    try {
      return new Date(row.created_at).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return row.created_at;
    }
  })();
  const excerpt = (row.preview || row.body || "").replace(/\s+/g, " ").trim().slice(0, 280);
  const reviewUrl = `${getSiteUrl()}/admin/stories?story=${encodeURIComponent(storyId)}`;

  const subject = "New Story Submitted — You're Full of Shit";
  const text = [
    "NEW STORY WAITING FOR REVIEW",
    "",
    `Title: ${row.title}`,
    `Category: ${category}`,
    `Type: ${typeShort} (${typeLabel})`,
    `Submitted by: ${submitter}`,
    `Submitted: ${when} PT`,
    excerpt ? `Excerpt: ${excerpt}` : null,
    "",
    `Review: ${reviewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0a0a0a;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #3f3f46;border-radius:16px;">
    <tr><td style="padding:28px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;color:#fb923c;text-transform:uppercase;">You're Full of Shit</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#fff;">NEW STORY WAITING FOR REVIEW</h1>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Title:</strong> ${escapeHtml(row.title)}</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Category:</strong> ${escapeHtml(category)}</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Type:</strong> ${escapeHtml(typeShort)} (${escapeHtml(typeLabel)})</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Submitted by:</strong> ${escapeHtml(submitter)}</p>
      <p style="margin:0 0 16px;"><strong style="color:#a1a1aa;">Submitted:</strong> ${escapeHtml(when)} PT</p>
      ${
        excerpt
          ? `<p style="margin:0 0 20px;padding:12px 14px;background:#09090b;border-radius:12px;color:#d4d4d8;font-size:14px;line-height:1.5;">${escapeHtml(excerpt)}</p>`
          : ""
      }
      <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:12px 22px;background:#f97316;color:#000;font-weight:800;text-decoration:none;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;">Review Story</a>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      text,
      html,
    });
    if (sendErr) {
      console.error("[admin-notify] Resend send failed", sendErr);
      await service
        .from("admin_story_notifications")
        .update({
          status: "failed",
          error: String(sendErr.message ?? sendErr).slice(0, 500),
        })
        .eq("story_id", storyId);
      return { ok: false, error: "resend_send_failed" };
    }
  } catch (e) {
    console.error("[admin-notify] Resend threw", e);
    await service
      .from("admin_story_notifications")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message.slice(0, 500) : "send_threw",
      })
      .eq("story_id", storyId);
    return { ok: false, error: "resend_threw" };
  }

  await service
    .from("admin_story_notifications")
    .update({
      status: "sent",
      emailed_at: new Date().toISOString(),
      error: null,
    })
    .eq("story_id", storyId);

  return { ok: true };
}
