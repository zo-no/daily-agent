# Feature Specification: Mobile App Store Container

**Requirement**: `REQ-20260906-01`
**Legacy Board Item**: `LN-037`
**Feature Directory**: `REQ-20260906-01-mobile-app-container`
**Created**: 2026-09-06
**Status**: Draft
**Input**: User description: "将现有 Log Note PWA 通过可维护的 Android/iOS 容器上线应用市场，优先复用现有业务和数据能力。"

> This feature refines the application-distribution slice of LN-037. It does not change the
> board item's deployment, account, or production-acceptance status.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-device, OAuth, store-review,
and production evidence MUST remain explicitly separate from local automation evidence.

### User Story 1 - Install and open Log Note as a real mobile app (Priority: P1)

A user can install Log Note from the Android or iOS application store, open it from the home
screen, and reach the existing account gate without being sent to a generic browser page.

**Why this priority**: Store distribution is the requested outcome. The smallest useful release is
an app that can be installed, launched, updated, and identified as Log Note on both platforms.

**Independent Test**: Build signed release candidates for both platforms, install them on supported
physical devices, cold-launch, background/foreground, update over an older build, and confirm the
app remains launchable and reaches the existing account gate.

**Acceptance Scenarios**:

1. **Given** a supported Android or iOS device and a published release, **When** the user installs
   and launches Log Note, **Then** the app opens its branded shell and reaches the existing account
   gate without requiring a browser tab.
2. **Given** an installed older release with local app data, **When** the user upgrades to a newer
   release, **Then** the app starts successfully and preserves the local account-scoped payload.
3. **Given** the app is backgrounded or the process is reclaimed, **When** the user returns to it,
   **Then** the app restores a usable state or safely returns to the account gate without exposing
   another account's data.

### User Story 2 - Continue the core recording loop offline (Priority: P1)

An already authenticated user can record, browse, search, edit, and delete notes in the mobile app
without a network connection, then synchronize safely when connectivity returns.

**Why this priority**: Offline continuity and account isolation are the product's highest-priority
quality attributes and must not be weakened by the mobile container.

**Independent Test**: Authenticate with synthetic data, disable network access at the device level,
complete the core record loop, terminate and relaunch the app, reconnect, and verify the same account
payload and revision-checked synchronization behavior.

**Acceptance Scenarios**:

1. **Given** a previously authenticated device with cached account data, **When** the user is
   offline, **Then** they can create, browse, search, edit, and delete records and see changes
   immediately in the local app.
2. **Given** offline changes exist, **When** connectivity returns, **Then** synchronization retries
   through the existing local-first revision/CAS path and does not silently overwrite a newer
   remote revision.
3. **Given** the user switches accounts or an account session expires, **When** the app reloads,
   **Then** the prior account's records and images are not shown under the new account.
4. **Given** storage initialization fails, the app is offline without a prior authenticated cache,
   or a revision conflict occurs, **When** the user attempts a write, **Then** the app shows a
   recoverable state and performs no unsafe cross-account or blind overwrite.

### User Story 3 - Use mobile file and authentication capabilities (Priority: P2)

An authenticated user can use the existing login, image attachment, backup/restore, and export
flows from the app using the device's normal browser and file/share surfaces.

**Why this priority**: These capabilities make the container materially useful and distinguish it
from a URL-only wrapper, but they can follow the core record loop if release risk requires staging.

**Independent Test**: On both platforms, complete login callback, image selection, backup export,
backup restore, Markdown/JSON export, and cancellation/error paths using real device file surfaces.

**Acceptance Scenarios**:

1. **Given** a user starts email or supported OAuth login, **When** the provider finishes or the
   user cancels, **Then** the app returns through a verified app callback or a clear recoverable
   error without leaking credentials into app data.
2. **Given** the user selects an image or backup file, **When** they confirm or cancel the system
   picker, **Then** the existing account-scoped attachment and validation semantics are preserved.
3. **Given** the user exports records or a backup, **When** the device share/save surface opens,
   **Then** the generated content remains compatible with existing JSON, Markdown, and portable
   attachment restore flows.
4. **Given** an unsupported file, interrupted picker, denied permission, or insufficient storage,
   **When** the operation fails, **Then** current data remains unchanged and the user can retry.

### User Story 4 - Pass store readiness and release verification (Priority: P2)

The project owner can submit both platform builds with accurate privacy, account deletion, data
handling, screenshots, and support metadata, and can reproduce the release verification evidence.

**Why this priority**: A technically working container is not complete until it can pass application
store review and be safely updated.

**Independent Test**: Run the release checklist against signed candidates, complete internal/beta
distribution, submit both stores, and record review outcomes and any remediation without claiming
acceptance before external evidence exists.

**Acceptance Scenarios**:

1. **Given** a signed release candidate, **When** the store submission checklist is completed,
   **Then** package identity, privacy disclosures, account deletion path, screenshots, support URL,
   and review notes are internally consistent.
2. **Given** a store review rejection or required metadata change, **When** the issue is diagnosed,
   **Then** the app can be corrected and resubmitted without changing the raw-note or backup
   contracts.
3. **Given** a released build, **When** a newer build is submitted, **Then** upgrade and rollback
   evidence identifies whether local data, sessions, and pending sync work are preserved.

### Edge Cases

- First launch while offline or before any authenticated cache exists.
- App process termination during a local write, attachment write, backup import, or cloud sync.
- Device storage pressure, denied photo/file permissions, and cancelled system pickers.
- OAuth callback opened in a browser, stale callback, duplicate callback, or callback after account
  switching.
- App update across a version with changed web assets or service-worker state.
- Android system back, iOS swipe-back, keyboard presentation, safe-area insets, and reduced-motion
  settings.
- Remote revision conflict, expired session, network recovery, and two-account switching.
- Store review identifies that the app has insufficient native value or inaccurate data disclosure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST provide installable, identifiable Android and iOS packages that
  open Log Note through the approved HTTPS application origin without requiring the user to
  manually navigate to a website.
- **FR-002**: The mobile package MUST preserve the existing account gate, authenticated account
  ownership, local-first writes, revision/CAS conflict behavior, and offline core recording loop.
- **FR-003**: The mobile package MUST preserve the existing raw-note, JSON, Markdown, and portable
  attachment backup/restore semantics; invalid or cancelled operations MUST NOT replace current
  data.
- **FR-004**: The mobile package MUST support safe foreground/background, cold-start, process
  reclaim, update, and network-recovery transitions without cross-account data exposure. First
  launch may require network access to fetch the approved application origin; an already
  authenticated device MUST retain the existing offline behavior after a successful load.
- **FR-005**: The mobile package MUST provide platform-appropriate login callbacks, file/image
  selection, export/share, keyboard, safe-area, and back-navigation behavior for the in-scope
  flows.
- **FR-006**: The mobile package MUST keep remote AI and Google Calendar behind the existing
  authenticated boundaries; Calendar and external MCP/Agent Bridge transport are excluded from
  the first store release unless separately admitted.
- **FR-007**: The release MUST include automated browser/PWA regression plus device-level Android
  and iOS verification for the acceptance scenarios that browser automation cannot prove.
- **FR-008**: Store submission materials MUST accurately describe data access, privacy, account
  deletion, support, and the app's offline/local-first behavior.
- **FR-009**: The mobile package MUST not add a required recording decision, change the stored time
  or note schema, create a second persistence writer, or bypass the existing `commitData` and
  revision-checked synchronization path.
- **FR-010**: The feature MUST have a removal path that can disable store packages and native
  adapters without migrating or rewriting existing Log Note records and backups.

### Key Entities

- **Mobile Release Package**: A signed Android or iOS artifact with stable application identity,
  version, supported OS range, icons, display metadata, and review metadata.
- **Native Capability Adapter**: A narrow platform bridge for login callback, file/image picker,
  share/export, network/lifecycle, safe-area, keyboard, and back navigation.
- **App Session**: The current platform lifecycle and authenticated account context, including
  foreground/background state and callback state.
- **Store Evidence Record**: Reproducible build, device, regression, privacy, submission, review,
  and update evidence; it is not user data and must not contain private records or credentials.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Signed Android and iOS release candidates install and cold-launch successfully on at
  least one supported physical device per platform and reach the account gate within 5 seconds after
  the app is ready.
- **SC-002**: 100% of the core offline scenarios in User Story 2 pass on both platforms, including
  relaunch after process termination and reconnect synchronization.
- **SC-003**: 100% of account-switch, stale-revision, invalid-restore, and cancelled-picker
  scenarios leave the prior account payload unchanged and produce no blind overwrite.
- **SC-004**: Existing automated quality gates remain green, including `npm run check`, with any
  mobile-specific failures isolated and explained before return.
- **SC-005**: A signed release can be submitted to both stores with internally consistent package,
  privacy, support, account-deletion, screenshot, and review metadata.
- **SC-006**: Updating from the first release candidate to a later candidate preserves valid local
  account data and pending-safe sync state in all tested upgrade paths.
- **SC-007**: Removing the mobile package and adapters requires no data migration, backup rewrite,
  or change to the existing web/PWA persistence contract.

## Assumptions

- The first store release targets both Android and iOS and uses a thin native container around the
  existing HTTPS-served mobile-first web application rather than a React Native, Flutter, Swift, or
  Kotlin rewrite. The web application remains the runtime and source of truth; the container adds
  only platform adapters and store packaging.
- Existing Next.js Route Handlers, Supabase, AI capability boundaries, and cloud deployment remain
  online dependencies; the container does not make server functionality local.
- The first store release includes login, core records, offline/local-first sync, attachments,
  backup/restore, and export/share. Google Calendar and MCP/Agent Bridge are deferred and remain
  available only where their current web boundary supports them.
- The project owner supplies valid Android and Apple developer accounts, signing identities, package
  identifiers, store privacy/support URLs, and any provider credentials needed for real verification.
- A store can reject a thin wrapper even when it is technically functional; native capability
  adapters and honest review notes are therefore part of the acceptance scope.
- Existing dirty working-tree changes belong to the user and are outside this feature's write set.

## Exclusions

- Rewriting the UI in React Native, Flutter, Swift, Kotlin, or another native rendering stack.
- Introducing a second business store, database, sync writer, raw-note schema, or AI mutation path.
- Adding push notifications, widgets, watch apps, background cloud sync, subscriptions, analytics,
  social features, or generalized task/calendar management.
- Making Calendar or MCP/Agent Bridge a launch blocker for the first store release.

## Admission and Exit Conditions

- The slice remains admitted only if it preserves quick record, account isolation, offline use,
  backup compatibility, and the existing quality gate.
- Keep the native adapters isolated or remove them if either store rejects the package for lacking
  meaningful app value, if local data is not reliably preserved across updates, or if device
  verification reveals unsafe account/sync behavior.
- Do not claim store acceptance, real OAuth success, or production data safety from local builds;
  those remain open evidence until observed in the real environments.
