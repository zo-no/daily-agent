# Data Model: Meituan Internal Log Note

The internal release introduces no new note payload or backup format. It uses the existing document
shape and adds only distribution/configuration evidence. No evidence record contains credentials,
employee identifiers, access tokens, or note bodies.

## Employee Identity Compatibility

- sessionOwnerPresent: boolean.
- sessionOwnerIsUuid: boolean.
- authUserRowExists: boolean.
- authenticatedRoleWorks: boolean.
- serverTokenVerificationWorks: boolean.
- repeatSignInStable: boolean.
- twoIdentityOwnersDistinct: boolean.
- availableClaimNames: names only, limited to provider and approved sso_* keys.
- decision: compatible, incompatible, or unverified.

Rules:

- compatible requires every owner/auth/role/stability check to pass.
- The session owner value, MIS, employee number, email, token, and claim values are never copied into
  this record.
- incompatible blocks schema reuse and deployment promotion.
- MIS/email/employee text is never coerced into UUID or used as a shared fallback.

## Internal Account Workspace

- platform: approved Meituan-hosted Supabase-compatible service.
- workspaceStatus: absent, created, configured, verified, or blocked.
- branchStatus: absent, created, migrated, verified, or blocked.
- authProviderStatus: absent, configured, compatible, or incompatible.
- schemaVersion: the pair of existing Log Note migration versions when applied.
- configurationStatus: boolean result only; values are not copied.

State transitions:

1. absent → created after authorized control-plane creation.
2. created → configured after company SSO and callback are present.
3. configured → verified only after identity compatibility, schema, RLS, RPC, and CAS evidence pass.
4. Any failed gate moves the corresponding state to blocked; it does not weaken access rules.

## Internal Document

The existing entities remain unchanged:

- one current document per stable UUID owner;
- revision history per owner and revision;
- payload, data/structure versions, device ID, operation ID, and timestamps;
- forced per-owner RLS and authenticated-only reads;
- CAS save with first revision, idempotency, stale-revision refusal, and bounded history.

No existing public-workspace document is copied. First acceptance creates synthetic content only.
Image blobs remain account-scoped and local; their references are omitted from the synchronized
payload as before.

## Internal Distribution Configuration

- authMode: meituan-sso for the internal build; standard remains the default elsewhere.
- publicBrowserConfiguration: AIBase URL and publishable/anon key supplied in the build control, values
  never copied to evidence.
- privilegedConfiguration: SSO client secret and any administrative database credential remain only
  in their control planes.
- disabledIntegrations: email/password entry, Google sign-in, Google Calendar, remote AI.
- runtimeContract: Node 20, deterministic install/build/start, port 3100.

## Internal Release

- commit: exact pushed source revision.
- branch: reviewed remote source branch.
- qualityGate: command, timestamp, pass/fail totals.
- predecessor: prior verified commit after the first accepted release.
- deploymentStatus: candidate, deployed, verified, failed, or rolled-back.
- internalUrl: CatPaw-generated HTTPS address.
- healthStatus: HTTP result and timestamp only.
- logReview: pass/fail and timestamp only.
- rollbackResult: selected target, elapsed time, and result.

Rules:

- One running candidate maps to exactly one commit.
- A failed quality or real-environment gate cannot become verified.
- Before the first verified release there is no predecessor; failure leaves the pilot unavailable.

## Acceptance Evidence

- identity: boolean/type compatibility results only.
- isolation: two-direction pass/fail for two synthetic employee sessions.
- deviceConflict: first save, second device, stale revision, and explicit resolution pass/fail.
- coreLoop: sign-in, create, refresh, browse, search, edit/delete, backup, offline, reconnect, sign-out.
- report: status/header/byte-length pass/fail with no body.
- dataClassification: synthetic non-sensitive only.

Evidence never includes account identifiers, note text, environment values, request bodies, or
screenshots that expose private data.
