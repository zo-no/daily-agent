# Quickstart: Mobile App Store Container

This guide validates the smallest release candidate without changing the existing web deployment.

## Prerequisites

- Node.js 22.13 or newer.
- Android Studio and an Android emulator/device.
- Xcode and an iOS simulator/device for iOS builds.
- A test HTTPS Log Note origin with public Supabase configuration and synthetic account data.
- Platform signing identities only for release-candidate validation; never commit them.

## Local contract checks

```sh
npm test
npm run design:check
npm run build
git diff --check
```

Expected result: existing browser/model contracts pass; no test uses private records or credentials.

## Container checks

1. Configure `LOG_NOTE_MOBILE_ORIGIN` with the approved HTTPS origin for the container and set
   `NEXT_PUBLIC_LOG_NOTE_NATIVE_CALLBACK_URL=lognote://auth/callback` in the web build when native
   OAuth callbacks are enabled. Register the same callback in the Supabase provider allowlist.
2. Build and launch the Android debug container.
3. Build and launch the iOS debug container.
4. Verify account gate, login callback, Android back, iOS navigation, safe-area, keyboard, and
   external-origin handling.
5. With a synthetic authenticated account, disable network access and verify create, browse, search,
   edit, delete, app background/foreground, process relaunch, and reconnect synchronization.
6. Verify image picker, backup import, JSON/Markdown export, share/save, cancellation, denied
   permission, and insufficient-storage paths.
7. Upgrade from an older debug/release candidate and verify account payload, attachments, and safe
   pending-sync state.

## Release evidence

- Record package identity, version, tested OS/device, build commit, and origin.
- Record screenshots and privacy/account-deletion/support URLs.
- Run Android internal testing and iOS TestFlight before store submission.
- Keep store review outcomes and production observations open until independently observed.
