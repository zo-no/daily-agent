# Mobile Container Contract

## Runtime origin

- The container loads one approved HTTPS origin configured at build time.
- Navigation to an unapproved external origin is blocked or handed to the system browser.
- No access token, private record, or secret is placed in a URL query string, native log, or store
  metadata.

## Deep-link and OAuth callback

- The app registers one versioned callback scheme/domain for the deployed environment.
- Callback handling is one-time, origin/provider checked, and safe on duplicate, stale, cancelled,
  or expired callbacks.
- Successful callback returns to the existing `/auth/callback` contract and then the normal account
  gate/home flow.
- Failed callback leaves current local data unchanged and presents a retry path.

## Native bridge boundary

- `openExternal(url)`: only for approved provider/login or explicitly user-requested external links.
- `pickImage()`: returns a browser-compatible image `File`/`Blob` or a cancellation/error result.
- `pickBackup()`: returns a browser-compatible backup `File` or a cancellation/error result.
- `shareFile({ filename, mimeType, bytes })`: shares existing export/backup bytes without changing
  account state.
- `getLifecycleState()` and `getNetworkState()`: update UI/retry behavior only; they never decide
  whether a cloud write succeeded.
- `handleBack()`: closes the topmost app surface, picker, search, calendar, or dialog before leaving
  the page; it must not discard an unsaved draft silently.

## Storage and sync boundary

- All text/plan/structure/settings writes continue through `commitData`.
- All attachment writes continue through the owner-scoped attachment store.
- Native adapters do not write Supabase, local account state, or backup files directly.
- On offline, conflict, account replacement, or stale state, the result is zero-write unless the
  existing explicit user-confirmed path approves the change.

## Release evidence boundary

- Local test output may contain synthetic data only.
- Real OAuth, device, signing, store review, and production evidence must be recorded separately and
  must not include credentials or private notes.
