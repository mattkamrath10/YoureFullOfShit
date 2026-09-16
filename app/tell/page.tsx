import { TellStoryForm } from "@/components/TellStoryForm";
import { getPlusUsageForRequest } from "@/lib/plus/server-usage";
import { getCategories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function TellPage() {
  const [categories, usage] = await Promise.all([
    getCategories(),
    getPlusUsageForRequest(),
  ]);
  return <TellStoryForm categories={categories} usage={usage} />;
}
