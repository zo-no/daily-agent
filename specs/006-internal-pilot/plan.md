# Implementation Plan: Meituan Internal Log Note

**Board Item**: LN-037 | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

> The plan describes how to satisfy the feature spec. AGENTS.md, the Constitution, product.md,
> and PROJECT_BOARD.md remain authoritative for governance, product truth, and task state.

## Summary

Follow the Hackathon deployment guidance in
[技术支持](https://km.sankuai.com/collabpage/2778881961),
[Hackathon 共享 Appkey 用户文档](https://km.sankuai.com/collabpage/2721737816), and
[用 CatPaw 部署 Web 应用](https://km.sankuai.com/collabpage/2761294276) as the main implementation
sequence. The assigned AppKey path uses DevTools/HulkPlus/Cargo; CatPaw CloudNative remains the
documented no-AppKey fallback rather than a second production route:

1. host the existing integrated Web application on the assigned AppKey through
   DevTools/HulkPlus/Cargo and publish it through Oceanus;
2. create a new AIBase Meituan-hosted Supabase-compatible workspace;
3. make Meituan SSO the only account entry for the internal distribution;
4. prove that the SSO session satisfies the existing stable UUID owner contract;
5. reuse the current schema, forced RLS, CAS revision function, account-scoped cache, offline behavior,
   and backups only after that compatibility gate passes;
6. release one clean, traceable revision and verify it with synthetic data, two employee identities,
   two devices, offline/reconnect, logs, the report endpoint, and rollback.

Official CatPaw/AIBase/Auth documents validate provider and security details but do not reorder this
Hackathon path. A later user decision now adds a separate public delivery lane: GitHub `master` runs
the public quality gate, builds a standalone artifact, and deploys it to the owner's Tencent CVM.
CatPaw remains versioned for the internal lane but is neither a GitHub dependency nor a Tencent
deployment controller. Existing data migration, DNS/ICP/certificate operations, public launch
announcement, and multi-instance operation remain out of scope.

## Technical Context

**Runtime**: Node.js 20 on CatPaw CloudNative; Next.js 15.5.23; React 19.1.1; browser/PWA
**Primary Dependencies**: Existing package lock and @supabase/supabase-js; deployment-only
@mtfe/hlb 1.0.0 for OCTO HTTP registration on Cargo
**Internal Identity and Storage**: AIBase Workspace with built-in Meituan SSO, Supabase Auth-compatible
session, PostgREST, Postgres RLS, and the existing save RPC when the UUID compatibility gate passes
**Local Ownership**: Existing localStorage account namespace plus IndexedDB image owner namespace,
keyed by the authenticated stable user ID
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation,
auth/distribution contracts, migration/RLS/CAS real-session checks
**Target Platform**: One HulkPlus/Cargo service behind one Oceanus/Cargo internal HTTPS swimlane URL,
plus one independently deployed personal Tencent CVM for the standard public distribution
**Configuration**: AIBase public URL/key and NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=meituan-sso at build time;
SSO client secret remains only in the identity/data control plane; remote-AI and Google values absent
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible;
no secret or employee identifier in repository evidence; synthetic data until real isolation passes
**Scale/Scope**: One service, one port 3100, one AIBase workspace/branch, one internal release URL,
one Tencent runtime on loopback port 3100, one known-good predecessor after first verification, no
availability commitment

## Source-of-Truth and Readiness Check

- [x] LN-037 exists and the user explicitly changed its first phase to a normally usable Meituan
  internal service.
- [x] The user instructed that the Hackathon article is the primary reference.
- [x] The dirty working tree was inspected; unrelated user-owned changes are preserved.
- [x] The earlier external-Supabase/email-password pilot artifacts were identified as stale and are
  being revised rather than deployed.
- [x] One main-checkout writer owns edits; parallel agents performed read-only evidence and code audits.
- [x] Oceanus main-domain routing and Cargo swimlane-domain generation were completed through the
  assigned AppKey control plane, with the observed HTTPS root and both readiness routes verified.
- [ ] AIBase identity/configuration and SSO callback controls remain real environment prerequisites
  requiring authorized access.
- [x] The user selected the personal Tencent CVM as the public runtime, required CatPaw to remain, and
  authorized repository implementation while leaving push and live control-plane mutation separate.

## Constitution Check

*GATE: Passed before design and re-checked after the design below.*

- [x] The ordinary composer and save step count are unchanged.
- [x] The internal account gate replaces alternate providers only for this distribution and does not
  add a post-login recording decision.
- [x] Authenticated offline use, account-owned caches, forced RLS, and stale-revision pause remain
  mandatory; no shared or guessed identity fallback is allowed.
- [x] Raw records, backups, exports, local image ownership, and old external data are not rewritten or
  migrated.
- [x] Exact identity/data/configuration/log boundaries, rollback, removal, tests, and real-session
  evidence are defined.
- [x] Deployment and external-account claims remain pending until observed; automation cannot
  fabricate AIBase, SSO, RLS, CatPaw, or rollback evidence.
- [x] The plan uses one new empty internal workspace and one distribution mode rather than a general
  auth/database rewrite.

## Existing System Investigation

### Reusable contracts

- src/app/supabase-browser.js already accepts a Supabase-compatible URL and public publishable/anon
  key, uses PKCE, persists sessions, and does not accept a service-role key.
- src/app/auth/callback/page.js exchanges a generic OAuth code and is not Google-specific.
- src/app/cloud-document-client.js reads the account document and calls the save RPC using the user
  access token; it does not accept a caller-provided owner ID.
- src/app/log-note-data-provider.js and the attachment layer already isolate local state by
  identity.id.
- supabase/migrations/20260816090000_log_note_documents.sql and
  20260816170000_require_expected_revision.sql define UUID ownership, forced RLS, auth.uid(), revision
  history, idempotent operation IDs, and stale-revision refusal.
- Server Agent routes use Supabase getUser(token). This must be observed against the AIBase-issued
  token even though remote AI remains disabled.
- The CatPaw manifest, fixed /api/healthz route, report verifier, and deployment contract test created
  during the earlier attempt remain useful after their external-Supabase wording is corrected.
- The assigned AppKey build uses `master` and its test deployment template, matching the Hackathon
  AppKey guide. Oceanus requires a normal OCTO HTTP node before it can select the service as a
  forwarding target. The official Node registration package is `@mtfe/hlb`; it receives the AppKey
  and port and derives Cargo swimlane/cell metadata from the runtime environment.
- Cargo can create or backfill the swimlane domain only after Oceanus has created a main domain. The
  generated form is `<swimlane>-sl-<main-domain>`; it must be copied from the control plane and never
  guessed as acceptance evidence.

### Required product-code changes

- Add a pure distribution/auth-mode resolver with standard as the default and meituan-sso as the
  internal value.
- Add a generic secure OAuth-origin check and a Meituan SSO start function using the provider ID
  confirmed in AIBase; preserve Google/password helpers for the default public mode.
- In internal mode, render one Meituan sign-in action at the account gate and remove email/password
  and Google entry from that rendered distribution.
- Derive display name/subtitle from safe user metadata fallbacks while keeping session.user.id as the
  only owner key on the compatible branch.
- Expose the distribution mode through AuthContext so Account settings can omit the Google Calendar
  section in the internal build.
- Add internal-mode translations and regressions without changing the signed-in home UI.

## Identity Compatibility Gate

No schema reuse or deployment promotion occurs until a real session records pass/fail for the
following non-sensitive facts:

| Check | Compatible result | Failure action |
| --- | --- | --- |
| Session owner | user.id exists, is UUID, and is stable on repeat sign-in | Stop and design an explicit owner mapping |
| Auth catalog | the signed-in user has a corresponding auth.users row | Stop; current foreign keys cannot be reused |
| Database role | PostgREST and RPC run as authenticated | Stop; do not weaken grants or RLS |
| Access rules | two employee identities can read/write only their own rows | Stop and repair identity/RLS before any real notes |
| CAS | first save, retry, second device, and stale revision preserve current semantics | Stop; do not replace with last-write-wins |
| Server verification | Supabase getUser accepts the internal access token | Keep remote routes disabled and repair verification |
| Claims | provider and available sso_mis/sso_emp_id claim names are known without copying values | Use only for display/audit if UUID ownership works |

If the gate fails, company usernames, email, MIS, and employee numbers must not be cast into UUID or
stored as a shared fallback. The feature returns to planning for a dedicated mapping/schema design.

## Proposed Design

### Phase A: AIBase control-plane proof

1. The authorized user opens AIBase Workspace in the company network and creates or selects a new
   Log Note workspace/branch.
2. The authorized user enables/configures the built-in Meituan SSO resource and registers the local
   callback used for the compatibility probe. Client secrets stay in the control plane.
3. The application runs locally with AIBase public browser configuration in an untracked environment
   file and internal auth mode enabled.
4. One real sign-in completes the provider-neutral callback. Only boolean/type results and claim
   names, never token or identity values, are recorded for the compatibility gate.
5. On a compatible result, apply the existing two schema migrations to the empty workspace and run
   anonymous-denial, first-save, retry/idempotency, second-identity RLS reversal, and stale-revision
   tests.

Phase A requires user control-plane access. Until it passes, implementation may add isolated
auth-mode regressions but must not claim that AIBase or SSO works.

### Phase B: Internal distribution implementation

1. Keep standard auth as the default build behavior.
2. For NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=meituan-sso, render only the company sign-in action, invoke the
   confirmed provider, reuse /auth/callback, and hide Calendar integration in Account settings.
3. Keep user.id as the owner only on the compatible branch. MIS/employee claims may improve display
   text but never become a guessed storage key.
4. Continue local-first writes, account-scoped caches, PostgREST reads, the CAS save RPC, offline PWA,
   backup/restore, and local image ownership unchanged.
5. Keep DEEPSEEK_API_KEY and Google client values absent. Optional Agent routes use their existing
   deterministic local fallback.

### Phase C: Traceable AppKey release and internal routing

1. Select and review the explicit release file set; exclude environment files, private/research
   material, generated output, and internal document exports.
2. Pass focused auth/deployment tests and the complete npm run check gate.
3. Commit and push the user-authorized release set to `master`, then clone that exact revision into a
   clean directory for the AppKey test build.
4. Deploy `manifest.yaml` through DevTools/HulkPlus/Cargo. At startup, use the reviewed
   deployment-only registration worker to register the AppKey and port 3100 with OCTO; fail closed
   after a bounded timeout and never print SDK errors, node addresses, or environment values.
5. Confirm the AppKey appears as a normal OCTO HTTP target, create the Oceanus main domain, then use
   Cargo to create or backfill the swimlane domain. Record only the observed HTTPS URL and exact
   source revision.
6. Register the exact HTTPS callback, then verify root, `/monitor/alive`, `/api/healthz`, company
   sign-in, core loop, report download, offline/reconnect, two identities, two devices, logs, and
   known-good recovery before calling the release usable.

### Phase D: Isolated GitHub-to-Tencent public delivery

1. Remove the CatPaw-only `@mtfe/hlb` graph from the root package and lockfile. Place it under
   `ops/catpaw/` with its own lockfile, and make both CatPaw manifests install that package explicitly.
2. Keep the GitHub root install public-only. Run design, unit, mobile, PWA, and diff checks with
   browser evidence redirected to the runner temporary directory.
3. On a successful GitHub `master` push only, validate production environment inputs and build the
   standard distribution once with Node 22 and Next.js standalone output.
4. Package `server.js`, traced runtime dependencies, `.next/static`, `public`, and exact-revision
   metadata into one immutable gzip archive; calculate SHA-256 before transport.
5. Upload through pinned-host SSH to `/opt/log-note/incoming`, then invoke a fixed root-owned deploy
   control. The deploy control validates path, revision, checksum, archive paths, and required files;
   extracts to `/opt/log-note/releases/<sha>`; and switches `/opt/log-note/current` atomically.
6. Restart the restricted `lognote` systemd service through a fixed root-owned launcher, poll the
   loopback readiness endpoint, and restore the prior symlink automatically on failure. The launcher
   keeps a bounded legacy `next start` branch only for the first standalone migration rollback. Do
   not install packages, build source, migrate data, prune releases, edit Nginx, or trigger CatPaw in
   the routine deployment.

### Data and trust flow

| Boundary | Allowed data | Authorization | Required evidence/fallback |
| --- | --- | --- | --- |
| Browser → Oceanus/Cargo Web | App assets, same-origin API calls explicitly triggered by the user | Internal HTTPS route and existing app checks | Both health routes return fixed data; report/AI bodies absent from logs |
| Cargo process → OCTO | AppKey, port, runtime-provided swimlane/cell registration metadata | Platform SGAgent and deployment-only @mtfe/hlb worker | Ten-second fail-closed watchdog; fixed redacted startup result only |
| Browser → AIBase Auth/data | OAuth code/session; one employee-owned text document without image blobs | Public browser key plus user token; forced RLS and CAS | Local-first/offline on failure; two-identity and stale-revision proof |
| AIBase → Meituan SSO | Identity protocol fields managed by the control plane | SSO client configuration not exposed to app source | Safe return to account gate on denial/error |
| Build → package sources | Locked package names, versions, tarballs | Approved CatPaw build network/mirror | Lockfile integrity; stop if unavailable |
| GitHub quality → public npm | Root public package graph only | Public npm lockfile integrity | Zero Meituan URLs; CatPaw graph isolated under ops/catpaw |
| GitHub build → Tencent incoming | Standalone archive, source revision, SHA-256 | Protected production environment, deploy SSH identity, pinned host key | Reject missing config, wrong host key, checksum, path, revision, or artifact shape |
| Tencent deploy control → systemd | Immutable release path and restart | Fixed root-owned command; restricted runtime user | Loopback readiness; atomic rollback to exact prior target |
| Google/remote AI | Nothing in first internal release | No client ID or AI secret supplied | Calendar hidden; deterministic local Agent fallback |

No access token, SSO secret, service-role key, employee identifier, environment value, private note,
or internal document body may enter Git, specs, tasks, screenshots, build logs, service logs, or
acceptance evidence.

## UI and Interaction Contract

Only the signed-out account gate and Account settings vary by distribution:

- internal mode: Log Note brand, language switch, concise company sign-in explanation, one Meituan
  sign-in button, safe unavailable/error state;
- signed-in internal mode: existing home and quick-record flow unchanged; Account settings shows
  identity, cloud status, backup boundary, and sign-out but no Google Calendar section;
- default mode: current email/password, Google, and Calendar behavior remains available for the
  separately planned public distribution.

The new company sign-in action must retain the existing keyboard behavior, visible focus, accessible
name, and minimum touch target. No new home control, modal, field, or recording decision is added.

## Project Structure and Write Set

~~~text
# Existing paths read
AGENTS.md
PROJECT_BOARD.md
product.md
DESIGN.md
package.json
package-lock.json
.env.example
src/app/auth-provider.js
src/app/auth/callback/page.js
src/app/supabase-browser.js
src/app/settings/settings-page.js
src/app/cloud-document-client.js
src/app/log-note-data-provider.js
src/lib/auth-model.mjs
supabase/migrations/**
tests/**
e2e/**

# Allowed implementation writes
.catpaw/catpaw_deploy.yaml
manifest.yaml
package.json
package-lock.json
.env.example
.gitignore
src/lib/auth-model.mjs
src/app/auth-provider.js
src/app/settings/settings-page.js
src/lib/i18n.mjs
src/app/api/healthz/route.js
src/app/monitor/alive/route.js
tests/auth-model.test.mjs
tests/internal-deployment.test.mjs
e2e/run-mobile.mjs
scripts/verify-report-api.mjs
ops/start-cargo.sh
ops/register-cargo-service.cjs
ops/catpaw-internal-pilot.md
ops/catpaw/package.json
ops/catpaw/package-lock.json
ops/build-tencent-release.sh
ops/deploy-tencent-release.sh
ops/start-tencent-server.sh
ops/sudoers/log-note-deploy
ops/tencent-github-deployment.md
ops/systemd/log-note.service
.github/workflows/quality.yml
next.config.mjs
tests/tencent-deployment.test.mjs
specs/006-internal-pilot/**
PROJECT_BOARD.md
product.md only if durable distribution behavior must be recorded

# Explicit exclusions from source, evidence, and deployment upload
.env.local
.next*/
node_modules/
private/
research/
review-*
output/**
tokens, keys, SSO configuration values, employee identifiers, personal notes, internal document exports
~~~

**Integration Order**: Complete the specification package and analysis; isolate the dependency
graphs; implement and test GitHub/Tencent delivery; then perform the AIBase
compatibility proof; implement internal-mode tests and UI; apply/verify schema on the compatible
branch; run the full local gate; independently review; select and push one clean release; deploy and
run real acceptance. One writer edits the main checkout and control-plane mutations are serialized.

## Test and Evidence Plan *(mandatory)*

### Automated regression

- Auth model: distribution-mode allowlist, secure origin, exact provider request, generic callback,
  safe identity display fallbacks, and no owner derived from MIS/email.
- Account gate: internal build exposes one SSO action and no password/Google controls; default build
  retains current behavior; callback errors remain recoverable.
- Settings: internal build omits Google Calendar controls while preserving identity, sync, backup, and
  sign-out; default build retains Calendar behavior.
- Deployment: manifests pin Node 20/install/build/start/port; Cargo registers the exact AppKey and
  port in a bounded worker before Next starts; `/monitor/alive` and `/api/healthz` remain fixed;
  environment/secret-like fields stay out of YAML and logs; the runbook reflects the real
  HulkPlus/Cargo/Oceanus route and AIBase rather than public Supabase.
- Existing data/cloud tests: account cache, local-first writes, CAS, backup, restore, report, and
  server token verification remain green.
- Complete gate: npm run check, including design validation, mobile browser scenarios, PWA production
  build/offline/persistence/update, production build, and git diff check.

### Real environment evidence

- AIBase workspace/branch exists; public URL/key are configured without recording values.
- One SSO session passes or fails every identity-compatibility check; exact claim values and tokens
  are not copied.
- Existing migrations apply to the empty workspace only on the compatible branch.
- Anonymous reads/RPC are denied; two employees are isolated in both directions; one employee on two
  devices triggers and resolves one stale-revision case without overwrite.
- CatPaw build control, exact commit, HTTPS URL, build/start result, root/readiness, and latest service
  log are observed.
- Online core loop, backup, sign-out/sign-in, authenticated offline use, reconnect, same-origin report,
  and known-good redeploy/rollback pass with synthetic data.
- A clean public-registry root install succeeds in GitHub, the production job builds one standalone
  artifact from the exact `master` revision, and the CVM activates it through the fixed deploy control.
- A controlled unhealthy-candidate rehearsal restores the exact prior release without a database,
  Nginx, CatPaw, or old-release deletion side effect.

### Evidence handoff

PROJECT_BOARD.md may record only boolean results, timestamps, test totals, exact source revision,
internal URL/project identifiers when appropriate, and redacted conclusions. It must not contain
public keys, secrets, access tokens, SSO claim values, employee identities, note bodies, or copied
internal-document content.

## Rollback, Removal, and Data Handling

- No existing external user or personal-note data is migrated.
- Before the first verified release, failure means the pilot remains unavailable.
- After the first verified release, rollback means selecting/redeploying its exact known-good source
  revision through the verified CatPaw control.
- A code rollback restores the prior distribution; it does not delete or rewrite the AIBase
  workspace. Any later workspace deletion requires a separate exact-target, retention, and recovery
  decision.
- Removing internal auth mode, deployment files, and the unused empty workspace returns the repository
  to its public-release path without changing backup formats or raw notes.
- Removing the GitHub deploy job stops future Tencent delivery without changing the live symlink.
  Rolling back chooses a prior immutable release; it does not reverse database migrations or delete
  releases.

## Complexity Tracking

| Added complexity | Why required now | Simpler alternative rejected because |
| --- | --- | --- |
| Distribution-specific auth mode | Gives employees one company entry while preserving the public path | Replacing auth globally would couple internal and public releases |
| AIBase compatibility gate | Protects UUID ownership, RLS, local cache, and CAS assumptions | Treating MIS claims as equivalent to auth.uid() risks cross-account failure |
| New empty internal workspace | Moves active auth/text data inside the approved boundary | Internal hosting with public Supabase does not meet the requested boundary |
| Clean traceable CatPaw release | Prevents dirty/private/generated state from entering deployment | Uploading the main checkout is unsafe and unreproducible |
| Fixed readiness plus real smoke | Separates process health from identity/data correctness | A 200 root page cannot prove SSO, RLS, CAS, offline, or backup behavior |
| Isolated CatPaw package graph | Lets CatPaw retain private OCTO registration while GitHub installs publicly | A private package in the root lockfile makes GitHub CI fail before tests |
| Standalone artifact plus root-owned deploy control | Avoids production builds and gives checksum, atomic switch, and automatic rollback | Pulling and building in the live checkout is slower, larger, and less reproducible |
