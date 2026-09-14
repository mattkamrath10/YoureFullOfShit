import { DiscoverHome } from "@/components/home/DiscoverHome";
import { getCategories, getPublishedStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stories, categories] = await Promise.all([
    getPublishedStories(),
    getCategories(),
  ]);

  return <DiscoverHome stories={stories} categories={categories} />;
}
