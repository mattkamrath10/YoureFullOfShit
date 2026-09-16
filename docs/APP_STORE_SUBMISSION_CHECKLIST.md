# App Store submission checklist

## Implemented
- [x] Privacy / Terms / Support URLs on laststoryteller.com
- [x] Reporting, moderation, account deletion
- [x] Capacitor iOS shell, bundle `com.laststoryteller.app`, Codemagic TestFlight upload
- [x] StoreKit 2 plugin (`PlusStore`) + server JWS verification for `source=apple`
- [x] Stripe Checkout hidden in the native app
- [x] iPad: `preferredContentMode: recommended`, responsive viewport, tablet layout (2-col feed, wider shell/auth/Plus, safe-area header/footer)
- [x] Subscription copy: Last Storyteller Plus $1.99/month (`com.laststoryteller.plus.monthly`)
- [x] Listing draft: `store/app-store/listing.json`

## You must complete in Apple / Codemagic / Stripe dashboards
- [ ] App Store Connect: subscription group + product `com.laststoryteller.plus.monthly` at $1.99/month
- [ ] Paid Applications Agreement, banking, tax
- [ ] Screenshots (iPhone + iPad)
- [ ] Age rating, App Privacy questionnaire (`docs/APP_STORE_PRIVACY_DATA_MAP.md`)
- [ ] Reviewer demo account (confirmed email)
- [ ] Codemagic: run **Last Storyteller iOS** (integration **Last Storyteller Codemagic**)
- [ ] Stripe test-mode product/price + webhook (web only)
- [ ] Apply Supabase migrations A0, S1, X on production after review
