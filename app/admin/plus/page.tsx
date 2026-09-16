import Link from "next/link";
import { requireAdmin } from "@/lib/stories-admin";
import { AdminPlusPanel } from "@/components/admin/AdminPlusPanel";

export const dynamic = "force-dynamic";

export default async function AdminPlusPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-black text-white">Forbidden</h1>
        <p className="text-sm text-zinc-400">Admin Plus is gated by profiles.is_admin.</p>
        <Link href="/" className="text-orange-300">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Admin</p>
        <h1 className="text-3xl font-black text-white">Plus grants</h1>
        <p className="mx-auto max-w-xl text-sm text-zinc-400">
          Grant or revoke admin/promo Plus. This does not create Stripe, Apple, or Google
          billing records, and it does not change is_admin.
        </p>
        <Link href="/admin/stories" className="text-sm text-orange-300">
          Review center
        </Link>
      </section>
      <AdminPlusPanel />
    </div>
  );
}
