import { apiError } from "@/lib/api/auth";
import { getCategories } from "@/lib/stories";

export async function GET() {
  try {
    const categories = await getCategories();
    return Response.json({ data: categories.map(({ id, slug, name, description, sort_order }) => ({ id, slug, name, description, sortOrder: sort_order })) });
  } catch {
    return apiError("CATEGORIES_UNAVAILABLE", "Categories are temporarily unavailable.", 503);
  }
}
