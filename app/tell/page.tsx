import { TellStoryForm } from "@/components/TellStoryForm";
import { getCategories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function TellPage() {
  const categories = await getCategories();
  return <TellStoryForm categories={categories} />;
}
