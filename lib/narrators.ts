export type NarratorPresenting = "feminine" | "masculine" | "androgynous";

export type VoiceHint = "female" | "male" | "neutral";

export type Narrator = {
  id: string;
  name: string;
  blurb: string;
  presenting: NarratorPresenting;
  voiceHint: VoiceHint;
  /** OpenAI TTS voice id (nova, onyx, alloy, shimmer, echo, fable). */
  openaiVoice: string;
  rate: number;
  pitch: number;
  src: string;
};

/** Default female-presenting storyteller. */
export const DEFAULT_NARRATOR_ID = "maya";

export const NARRATORS: Narrator[] = [
  {
    id: "maya",
    name: "Maya",
    blurb: "Friendly. Fun. Always Curious.",
    presenting: "feminine",
    voiceHint: "female",
    openaiVoice: "nova",
    rate: 0.96,
    pitch: 1.06,
    src: "/avatars/narrators/maya.jpg",
  },
  {
    id: "alex",
    name: "Alex",
    blurb: "Chill. Funny. Always Listening.",
    presenting: "masculine",
    voiceHint: "male",
    openaiVoice: "onyx",
    rate: 1.0,
    pitch: 0.9,
    src: "/avatars/narrators/alex.jpg",
  },
  {
    id: "jordan",
    name: "Jordan",
    blurb: "Thoughtful. Open-Minded. No Judgment.",
    presenting: "androgynous",
    voiceHint: "neutral",
    openaiVoice: "alloy",
    rate: 1.0,
    pitch: 1.0,
    src: "/avatars/narrators/jordan.jpg",
  },
  {
    id: "riley",
    name: "Riley",
    blurb: "Bold. Honest. Brings the Energy.",
    presenting: "feminine",
    voiceHint: "female",
    openaiVoice: "shimmer",
    rate: 1.02,
    pitch: 1.1,
    src: "/avatars/narrators/riley.jpg",
  },
  {
    id: "marcus",
    name: "Marcus",
    blurb: "Straightforward. Witty. Sees Both Sides.",
    presenting: "masculine",
    voiceHint: "male",
    openaiVoice: "echo",
    rate: 0.92,
    pitch: 0.84,
    src: "/avatars/narrators/marcus.jpg",
  },
  {
    id: "sofia",
    name: "Sofia",
    blurb: "Real. Relatable. Keeps It Real.",
    presenting: "feminine",
    voiceHint: "female",
    openaiVoice: "fable",
    rate: 0.98,
    pitch: 1.08,
    src: "/avatars/narrators/sofia.jpg",
  },
];

export function getNarrator(id: string | null | undefined): Narrator {
  const found = NARRATORS.find((n) => n.id === id);
  return found ?? NARRATORS.find((n) => n.id === DEFAULT_NARRATOR_ID)!;
}

/** Map a narrator id to an OpenAI TTS voice; defaults to Maya → nova. */
export function getOpenAiVoice(narratorId: string | null | undefined): string {
  return getNarrator(narratorId).openaiVoice;
}

export type MediaLike = {
  media_type?: string | null;
  mime_type?: string | null;
};

/**
 * Hide the avatar narrator when ANY video or audio is attached.
 * Images and documents (PDF) are allowed — text is still the primary story.
 */
export function storyHasVideoOrAudio(media: MediaLike[] | undefined | null): boolean {
  if (!media?.length) return false;
  return media.some((item) => {
    const type = (item.media_type ?? "").toLowerCase().trim();
    if (type === "video" || type === "audio") return true;
    const mime = (item.mime_type ?? "").toLowerCase().trim();
    if (mime.startsWith("video/") || mime.startsWith("audio/")) return true;
    return false;
  });
}

export function storyAllowsNarrator(args: {
  body?: string | null;
  media?: MediaLike[] | null;
}): boolean {
  if (!(args.body ?? "").trim()) return false;
  return !storyHasVideoOrAudio(args.media);
}

export function buildNarrationText(title: string, body: string): string {
  const t = title.replace(/\s+/g, " ").trim();
  const b = body.replace(/\s+/g, " ").trim();
  if (t && b) return `${t}. ${b}`;
  return b || t;
}
