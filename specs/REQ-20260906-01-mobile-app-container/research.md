# Research: Mobile App Store Container

## Decision 1: Use a native container around the approved HTTPS web origin

**Decision**: The first release uses a Capacitor-style Android/iOS container whose WebView loads the
existing deployed Next.js origin. Native code is limited to app identity, deep-link callbacks,
browser handoff, file/image/share surfaces, lifecycle/network signals, status-bar/safe-area,
keyboard, and platform back navigation.

**Rationale**: The current application uses Next.js App Router, standalone Node output, dynamic
Route Handlers, Supabase authentication, and server-side AI adapters. It is not a static-only bundle
that can be copied into a WebView without changing the server/runtime boundary. A remote origin
keeps the current server contract and requires the least business-code migration while still
providing an installable store artifact.

**Alternatives considered**:

- **Fully local web bundle**: rejected for the first slice because it would require proving a static
  export or adding an on-device server while preserving dynamic routes and server-side boundaries.
- **React Native/Flutter/native rewrite**: rejected because it duplicates the existing UI and
  persistence path, greatly increases migration scope, and is not required to validate store
  distribution.
- **URL-only WebView with no adapters**: rejected because it has weaker offline/lifecycle behavior,
  less meaningful native value, and a higher risk of store rejection as a repackaged website.

## Decision 2: Preserve browser storage and existing persistence ownership for v1

**Decision**: Keep account-scoped localStorage and IndexedDB as the v1 storage implementation. Add a
small environment adapter for app lifecycle, network state, deep links, files, and share/export;
do not introduce SQLite, a second store, or a second cloud writer.

**Rationale**: The existing `LogNoteDataProvider`, `commitData`, revision/CAS sync, attachment store,
backup parser, and Service Worker already encode the product invariants. Replacing storage during
containerization would create migration and cross-version risks unrelated to store packaging.

**Alternatives considered**:

- **SQLite migration**: deferred until real device evidence shows WebView storage loss or quota
  failures; requires an explicit migration spec and backup compatibility work.
- **Native Preferences/Filesystem as a second cache**: rejected because it would create two writers
  and account-isolation ambiguity.

## Decision 3: Keep Calendar and MCP out of the first store gate

**Decision**: Ordinary AI remains behind the current HTTPS/authenticated routes. Google Calendar and
external MCP/Agent Bridge transport are not first-release blockers.

**Rationale**: Calendar requires mobile OAuth lifecycle and long-lived token behavior; MCP currently
  depends on desktop/local bridge transport. Neither is necessary to validate the core recording
  loop or store packaging.

## Decision 4: Treat store and device evidence as external acceptance evidence

**Decision**: Local builds and browser tests prove code contracts only. Physical-device tests,
  OAuth callbacks, signing, beta distribution, store metadata, review outcome, and production
  updates remain explicit evidence fields.

**Rationale**: The repository constitution forbids claiming external-account, deployment, OAuth, or
  store acceptance from local automation.
