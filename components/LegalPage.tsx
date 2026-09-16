import Link from "next/link";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-6 md:max-w-4xl">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
      </header>
      <div className="space-y-6 rounded-3xl border border-white/10 bg-zinc-900/70 p-5 text-sm leading-7 text-zinc-300 sm:p-8 md:p-10">
        {children}
      </div>
      <p className="text-center text-xs text-zinc-500">
        <Link href="/support" className="text-amber-300 hover:text-amber-200">
          Contact support
        </Link>
        {" "}for questions about these policies.
      </p>
    </article>
  );
}
