/**
 * Client/native shell detection. Used to exclude web Stripe Checkout from the
 * iOS/Android Capacitor WebView. Do not treat Safari-on-iPhone as native.
 */
export const NATIVE_SHELL_USER_AGENT_MARK = "LastStorytellerNative";

export function isNativeShellUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  return new RegExp(`${NATIVE_SHELL_USER_AGENT_MARK}|Capacitor`, "i").test(ua);
}

export function isNativeShellWindow(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
      };
    }
  ).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  const platform = cap?.getPlatform?.();
  if (platform === "ios" || platform === "android") return true;
  return isNativeShellUserAgent(window.navigator.userAgent);
}
