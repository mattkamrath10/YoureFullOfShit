/**
 * Client/native shell detection. Used to hide web Stripe Checkout in iOS/Android WebViews.
 */
export function isNativeShellUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  return /LastStorytellerNative|Capacitor/i.test(ua);
}

export function isNativeShellWindow(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return isNativeShellUserAgent(window.navigator.userAgent);
}
