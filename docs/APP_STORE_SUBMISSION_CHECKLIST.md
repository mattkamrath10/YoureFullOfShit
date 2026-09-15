# App Store submission checklist

## Implemented in the web app
- [x] Public Privacy Policy: `https://laststoryteller.com/privacy`
- [x] Terms, Community Guidelines, and Support pages with published contact
- [x] Story/comment reporting and pre-publication story moderation
- [x] Account-deletion initiation and media cleanup flow
- [x] No paid digital purchases or subscriptions found

## Manual verification required
- [ ] Verify production report moderation response times and escalation process
- [ ] Verify R2/Supabase deletion cleanup using a non-production test account
- [ ] Complete App Privacy questionnaire from `APP_STORE_PRIVACY_DATA_MAP.md`
- [ ] Set App Store metadata, screenshots, age-rating answers, content rights, export compliance, support URL, and privacy URL
- [ ] Provide a reviewer test account or a reliable email-verification path
- [ ] Confirm the deployed Render service and Supabase/R2 environments are available

## Native wrapper required before App Store submission
This repository has no Capacitor or iOS project. Codemagic cannot produce an iOS App Store build until a native wrapper, bundle identifier, signing configuration, and Codemagic configuration are added. At that time, audit included native SDKs and add only required `Info.plist` permission strings and `PrivacyInfo.xcprivacy` declarations.
