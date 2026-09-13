import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-orange-400/20 bg-zinc-900/70 p-6 sm:p-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export const authInputClass =
  "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-orange-400/40 placeholder:text-zinc-600 focus:ring-2";

export const authPrimaryBtnClass =
  "w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-50";

export const authLinkClass = "font-semibold text-orange-300 hover:text-orange-200";
