"use client";

import type { MouseEvent, ReactNode } from "react";

function isHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isOurHost(href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host === "laststoryteller.com" || host.endsWith(".laststoryteller.com");
  } catch {
    return false;
  }
}

/**
 * Same-origin / signed media stays in the Capacitor WebView.
 * Foreign http(s) URLs use the system browser when running natively.
 */
export async function openAppLink(href: string): Promise<void> {
  if (!href) return;
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }

  if (isHttpUrl(href) && !isOurHost(href)) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: href });
    return;
  }

  window.location.assign(href);
}

export function AppMediaLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  async function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    await openAppLink(href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
