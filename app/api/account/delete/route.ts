import { deleteAccount } from "@/lib/account/delete-account";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const session = await createClient();
  const { data: auth } = await session.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in to delete your account." }, { status: 401 });

  try {
    await deleteAccount(auth.user.id);
    return Response.json({ deleted: true });
  } catch (cause) {
    console.error("[account/delete]", cause);
    return Response.json({ error: "Account deletion could not be completed. Some associated data may already have been removed; contact support if this continues." }, { status: 500 });
  }
}
