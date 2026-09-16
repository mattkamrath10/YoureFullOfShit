export function plusErrorMessage(error: { message?: string; code?: string } | null): {
  status: number;
  code: string;
  message: string;
} | null {
  const raw = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
  if (raw.includes("email_unconfirmed")) {
    return {
      status: 403,
      code: "EMAIL_UNCONFIRMED",
      message: "Confirm your email before telling a story.",
    };
  }
  if (raw.includes("email_account_required")) {
    return {
      status: 401,
      code: "EMAIL_ACCOUNT_REQUIRED",
      message: "Create an account to tell your story.",
    };
  }
  if (raw.includes("plus_required")) {
    return {
      status: 403,
      code: "PLUS_REQUIRED",
      message:
        "Your 2 free story submissions have been used. Join Last Storyteller Plus for $1.99/month to continue telling your stories.",
    };
  }
  if (raw.includes("monthly_large_video_limit")) {
    return {
      status: 403,
      code: "MONTHLY_LARGE_VIDEO_LIMIT",
      message: "You have used your 10 large-video uploads for this month.",
    };
  }
  if (raw.includes("storage_limit")) {
    return {
      status: 403,
      code: "STORAGE_LIMIT",
      message: "This upload would exceed the 10 GiB active storage limit.",
    };
  }
  if (raw.includes("video_too_large")) {
    return {
      status: 400,
      code: "VIDEO_TOO_LARGE",
      message: "Large videos can be at most 1 GiB.",
    };
  }
  if (raw.includes("not_large_video")) {
    return {
      status: 400,
      code: "NOT_LARGE_VIDEO",
      message: "R2 is only for videos larger than 50 MB.",
    };
  }
  if (raw.includes("reservation_not_found")) {
    return {
      status: 400,
      code: "RESERVATION_NOT_FOUND",
      message: "This upload reservation is no longer valid.",
    };
  }
  if (raw.includes("not_story_owner")) {
    return {
      status: 403,
      code: "NOT_STORY_OWNER",
      message: "Not allowed to upload to this story.",
    };
  }
  return null;
}
