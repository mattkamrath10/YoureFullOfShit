"use client";

import { useEffect } from "react";

/**
 * Capacitor-only launch helpers. No-ops in the browser / Render site.
 */
export function NativeShell() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || cancelled) return;
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* plugin optional in web */
      }
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#000B1E" });
      } catch {
        /* iOS uses Info.plist / storyboard for status bar */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
