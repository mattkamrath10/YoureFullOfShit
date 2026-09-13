import { ModerationDashboard } from "@/components/ModerationDashboard";
import type { Story } from "@/types/database";

/** @deprecated Prefer ModerationDashboard — kept for import compatibility. */
export function ModerationQueue({ stories }: { stories: Story[] }) {
  return <ModerationDashboard initialStories={stories} />;
}
