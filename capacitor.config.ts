import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS identity for the Capacitor shell.
 *
 * Bundle ID is the existing App Store Connect app:
 * Last Storyteller — com.laststoryteller.app (Apple ID 6812527848).
 * Do not change this without updating Apple Developer, Codemagic, and Xcode.
 */
export const IOS_BUNDLE_ID = "com.laststoryteller.app";
export const IOS_APP_NAME = "Last Storyteller";
export const IOS_MARKETING_VERSION = "0.1.0";
export const PRODUCTION_APP_URL = "https://laststoryteller.com";

const config: CapacitorConfig = {
  appId: IOS_BUNDLE_ID,
  appName: IOS_APP_NAME,
  webDir: "native/www",
  server: {
    url: PRODUCTION_APP_URL,
    cleartext: false,
    allowNavigation: [
      "laststoryteller.com",
      "www.laststoryteller.com",
      "*.supabase.co",
      "*.supabase.in",
    ],
  },
  ios: {
    contentInset: "never",
    preferredContentMode: "recommended",
    scrollEnabled: true,
    backgroundColor: "#000B1E",
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000B1E",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#000B1E",
    },
  },
};

export default config;
