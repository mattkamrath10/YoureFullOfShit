import "server-only";
import { Resend } from "resend";
import { sendAdminPushNotifications } from "@/lib/admin/send-push-notifications";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site";
import {
  getStoryType,
  getStoryTypeLabel,
  type MediaLike,
} from "@/lib/story-type";

export type NotifyNewStoryResult =
  | {
      ok: true;
      sent?: true;
      skipped?: "duplicate" | "not_pending";
      storyId?: string;
    }
  | {
      ok: false;
      error: string;
      detail?: string;
      storyId?: string;
    };

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
 * Never throws for Resend/config issues — returns { ok:false }.
 */
export async function notifyAdminsOfNewStory(
  storyId: string,
): Promise<NotifyNewStoryResult> {
  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (e) {
    console.error("[admin-notify] service client unavailable", e);
    return { ok: false, error: "service_role_missing", storyId };
  }

  // Dedupe claim (unique story_id) covers all alert channels.
  const { error: claimErr } = await service
    .from("admin_story_notifications")
    .insert({
      story_id: storyId,
      channel: "email",
      status: "sending",
    });
  if (claimErr) {
    if (
      claimErr.code === "23505" ||
      /duplicate|unique/i.test(claimErr.message ?? "")
    ) {
      return { ok: true, skipped: "duplicate", storyId };
    }
    console.error("[admin-notify] dedupe insert failed", claimErr);
    // Continue — still try to email once
  }

  // Plain stories row only — nested embeds were returning PostgREST errors
  // that we incorrectly labeled story_not_found.
  const { data: story, error: storyErr } = await service
    .from("stories")
    .select(
      "id, title, body, preview, status, is_anonymous, author_id, category_id, created_at",
    )
    .eq("id", storyId)
    .maybeSingle();

  if (storyErr) {
    console.error("[admin-notify] story lookup failed", storyId, storyErr);
    return {
      ok: false,
      error: "story_lookup_failed",
      detail: storyErr.message ?? String(storyErr.code ?? "unknown"),
      storyId,
    };
  }
  if (!story) {
    console.error("[admin-notify] story id not in stories table", storyId);
    return { ok: false, error: "story_not_found", storyId };
  }

  if (story.status !== "pending") {
    return { ok: true, skipped: "not_pending", storyId };
  }

  let category = "Uncategorized";
  if (story.category_id) {
    const { data: cat } = await service
      .from("categories")
      .select("name")
      .eq("id", story.category_id)
      .maybeSingle();
    if (cat?.name?.trim()) category = cat.name.trim();
  }

  let submitter = "Anonymous";
  if (!story.is_anonymous && story.author_id) {
    const { data: profile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", story.author_id)
      .maybeSingle();
    submitter = profile?.display_name?.trim() || "Named author";
  }

  const { data: mediaRows } = await service
    .from("story_media")
    .select("media_type, mime_type")
    .eq("story_id", storyId);
  const media = (mediaRows ?? []) as MediaLike[];
  const typeLabel = getStoryTypeLabel(media);
  const typeShort =
    getStoryType(media) === "video"
      ? "Video"
      : getStoryType(media) === "audio"
        ? "Audio"
        : "Text";

  const when = (() => {
    try {
      return new Date(story.created_at).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(story.created_at);
    }
  })();
  const excerpt = (story.preview || story.body || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  const reviewUrl = `${getSiteUrl()}/admin/stories?story=${encodeURIComponent(storyId)}`;
  const push = await sendAdminPushNotifications(service, {
    title: "New story waiting for review",
    body: String(story.title).trim() || "A new story is pending your review.",
    url: reviewUrl,
    tag: `yfosh-story-${storyId}`,
  });

  if (push.allDelivered) {
    console.info("[admin-notify] Web Push delivered", {
      storyId,
      toCount: push.delivered,
    });
    await service
      .from("admin_story_notifications")
      .update({ status: "sent", error: null })
      .eq("story_id", storyId);
    return { ok: true, sent: true, storyId };
  }

  // Email remains the fallback for any administrator without a working
  // subscription, as well as when VAPID or Web Push is unavailable.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error(
      "[admin-notify] Web Push incomplete and Resend is not configured.",
    );
    await service
      .from("admin_story_notifications")
      .update({ status: "failed", error: "push_incomplete_and_resend_not_configured" })
      .eq("story_id", storyId);
    return { ok: false, error: "resend_not_configured", storyId };
  }

  const recipients = await resolveAdminEmails(service);
  if (recipients.length === 0) {
    console.error(
      "[admin-notify] no admin emails resolved (profiles.is_admin + ADMIN_NOTIFY_EMAIL).",
    );
    await service
      .from("admin_story_notifications")
      .update({ status: "failed", error: "no_admin_recipients" })
      .eq("story_id", storyId);
    return { ok: false, error: "no_admin_recipients", storyId };
  }

  const subject = "New Story Submitted — Last Storyteller";
  const text = [
    "NEW STORY WAITING FOR REVIEW",
    "",
    `Title: ${story.title}`,
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
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;color:#f5b942;text-transform:uppercase;">Last Storyteller</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#fff;">NEW STORY WAITING FOR REVIEW</h1>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Title:</strong> ${escapeHtml(String(story.title))}</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Category:</strong> ${escapeHtml(category)}</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Type:</strong> ${escapeHtml(typeShort)} (${escapeHtml(typeLabel)})</p>
      <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Submitted by:</strong> ${escapeHtml(submitter)}</p>
      <p style="margin:0 0 16px;"><strong style="color:#a1a1aa;">Submitted:</strong> ${escapeHtml(when)} PT</p>
      ${
        excerpt
          ? `<p style="margin:0 0 20px;padding:12px 14px;background:#09090b;border-radius:12px;color:#d4d4d8;font-size:14px;line-height:1.5;">${escapeHtml(excerpt)}</p>`
          : ""
      }
      <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:12px 22px;background:#f5b942;color:#000;font-weight:800;text-decoration:none;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;">Review Story</a>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const resend = new Resend(resendKey);
    const { data: sendData, error: sendErr } = await resend.emails.send({
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
      return {
        ok: false,
        error: "resend_send_failed",
        detail: String(sendErr.message ?? sendErr).slice(0, 300),
        storyId,
      };
    }
    console.info("[admin-notify] Resend accepted", {
      storyId,
      emailId: sendData?.id,
      toCount: recipients.length,
    });
  } catch (e) {
    console.error("[admin-notify] Resend threw", e);
    await service
      .from("admin_story_notifications")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message.slice(0, 500) : "send_threw",
      })
      .eq("story_id", storyId);
    return {
      ok: false,
      error: "resend_threw",
      detail: e instanceof Error ? e.message.slice(0, 300) : "send_threw",
      storyId,
    };
  }

  await service
    .from("admin_story_notifications")
    .update({
      status: "sent",
      emailed_at: new Date().toISOString(),
      error: null,
    })
    .eq("story_id", storyId);

  return { ok: true, sent: true, storyId };
}
