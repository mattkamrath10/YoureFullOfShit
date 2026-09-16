/** Plus purchase surfaces. Native/iOS never uses Stripe Checkout. */

export const IOS_PLUS_NO_WEB_PURCHASE_MESSAGE =
  "Purchases and Restore Purchases will be available through the iOS app. No web purchase is processed.";

export type PlusPurchaseSurface =
  | "loading"
  | "sign-in"
  | "ios-iap"
  | "web-stripe"
  | "web-unconfigured";

export function resolvePlusPurchaseSurface(args: {
  loading: boolean;
  isSignedIn: boolean;
  isNative: boolean;
  stripeConfigured: boolean;
}): PlusPurchaseSurface {
  if (args.loading) return "loading";
  if (args.isNative) {
    if (!args.isSignedIn) return "sign-in";
    return "ios-iap";
  }
  if (!args.isSignedIn) return "sign-in";
  if (args.stripeConfigured) return "web-stripe";
  return "web-unconfigured";
}
