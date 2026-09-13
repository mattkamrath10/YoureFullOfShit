export type Verdict = "believe" | "maybe" | "full_of_shit";

export type StoryStatus = "draft" | "pending" | "published" | "rejected";

/** video | audio | image | document — audio optional until DB check allows it */
export type MediaType = "video" | "audio" | "image" | "document";

export type MediaStorageProvider = "supabase" | "r2";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
};

export type Story = {
  id: string;
  author_id: string | null;
  category_id: string;
  title: string;
  body: string;
  preview: string;
  is_demo: boolean;
  is_published: boolean;
  status: StoryStatus;
  is_anonymous: boolean;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
  profiles?: Profile | null;
  story_media?: StoryMedia[];
};

export type StoryMedia = {
  id: string;
  story_id: string;
  owner_id: string;
  media_type: MediaType;
  /** Supabase object path OR R2 object key (see storage_provider). */
  storage_path: string;
  /**
   * Where the bytes live. Optional until migration applied;
   * treat missing/undefined as "supabase" for existing rows.
   */
  storage_provider?: MediaStorageProvider;
  file_name: string | null;
  mime_type: string | null;
  byte_size: number | null;
  sort_order: number;
  created_at: string;
};

export type StoryVote = {
  id: string;
  story_id: string;
  user_id: string;
  verdict: Verdict;
  created_at: string;
  updated_at: string;
};

export type VoteTallies = {
  believe: number;
  maybe: number;
  full_of_shit: number;
  total: number;
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  believe: "I Believe It",
  maybe: "Maybe",
  full_of_shit: "You're Full of Shit",
};

/** Short badge label */
export const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Draft",
  pending: "PENDING",
  published: "PUBLISHED",
  rejected: "REJECTED",
};

/** User-facing explanation under the badge */
export const STATUS_HELP: Record<StoryStatus, string> = {
  draft: "Not submitted yet",
  pending: "Waiting for review",
  published: "Live on Discover",
  rejected: "Not approved",
};
