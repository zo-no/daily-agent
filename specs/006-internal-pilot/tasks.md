---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Meituan Internal Log Note

**Board Item**: LN-037
**Input**: Feature artifacts from /specs/006-internal-pilot/
**Prerequisites**: spec.md, plan.md, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> PROJECT_BOARD.md remains the sole task-status and acceptance source.

## Format: [ID] [P?] [Story?] Description with exact path

- [P] means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- [Story] maps implementation and tests to one independently testable user story.
- External control-plane tasks record only redacted boolean evidence in the named repository path.

## Phase 1: Reconcile and Guard the Revised Work

- [x] T001 Update the existing LN-037 row in PROJECT_BOARD.md to replace the public-Supabase
  email/password pilot with the Hackathon-led CatPaw + AIBase + Meituan SSO internal release and its
  compatibility stop conditions
- [x] T002 Confirm .specify/feature.json points to specs/006-internal-pilot and review
  specs/006-internal-pilot/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/}
  against the user instruction and Constitution
- [x] T003 Confirm the exact write set and exclusions in specs/006-internal-pilot/plan.md against
  git status, preserving unrelated user-owned changes and one-writer ownership
- [x] T004 Update the durable account/distribution wording in product.md to state that the internal
  distribution uses company SSO and approved internal text sync while the public distribution
  retains its existing auth path; do not broaden real-data approval

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define internal distribution, identity, configuration, and deployment boundaries before
implementation.

- [x] T005 [P] Add failing distribution-mode, Meituan OAuth request, stable-owner display fallback,
  and default-mode compatibility tests in tests/auth-model.test.mjs
- [x] T006 [P] Add failing signed-out internal account-gate and signed-in Account-settings regression
  to e2e/run-mobile.mjs for one SSO action, no password/Google controls, and no Google Calendar
- [x] T007 [P] Revise tests/internal-deployment.test.mjs to require the AIBase/Meituan SSO runbook,
  build-mode boundary, fixed CatPaw Node 20/port 3100 contract, and absence of secret-like fields
- [x] T008 Run node --test tests/auth-model.test.mjs tests/internal-deployment.test.mjs and the
  focused internal-mode browser scenario, recording the expected pre-implementation failures without
  changing unrelated output/**

## Phase 3: User Story 1 - Sign in and use the internal service (Priority: P1)

**Goal**: Provide one company sign-in entry for the internal distribution while preserving the
default/public auth behavior.

**Independent Test**: The internal build shows one Meituan action, completes the generic callback,
returns safely on failure, and repeat sign-in maps to the same stable owner; the default build retains
its existing account controls.

- [x] T009 [US1] Implement the allowlisted standard/meituan-sso distribution resolver, generic secure
  OAuth-origin check, Meituan provider request, and safe metadata display fallbacks in
  src/lib/auth-model.mjs
- [x] T010 [US1] Implement the internal AuthContext mode and SSO-only account gate while preserving
  default password/Google behavior in src/app/auth-provider.js
- [x] T011 [US1] Omit the Google Calendar workspace only in internal mode and keep identity, cloud,
  conflict, backup, and sign-out surfaces in src/app/settings/settings-page.js
- [x] T012 [US1] Add concise English/Chinese internal sign-in, redirect, denied, and unavailable copy
  without changing signed-in home copy in src/lib/i18n.mjs
- [x] T013 [US1] Document the public non-secret auth-mode flag and AIBase browser configuration
  placeholders, never real values, in .env.example
- [x] T014 [US1] Pass tests/auth-model.test.mjs and the focused internal/default account-gate tests in
  e2e/run-mobile.mjs, including callback failure and accessible action semantics
- [ ] T015 [US1] Ask the authorized user to open https://aibase.mws.sankuai.com/workspace, then record
  only access available/blocked in PROJECT_BOARD.md; do not request a pasted key or token
- [ ] T016 [US1] With the authorized user, create/select the empty AIBase workspace/branch and
  configure built-in Meituan SSO plus the local callback; record only configured/blocked status in
  PROJECT_BOARD.md
- [ ] T017 [US1] Complete one local real SSO session and record the boolean/type compatibility fields
  from specs/006-internal-pilot/data-model.md in PROJECT_BOARD.md without identity, token, or claim
  values; stop and return to owner-model planning if any hard gate fails

## Phase 4: User Story 2 - Complete the account-owned core loop (Priority: P1)

**Goal**: Reuse the current local-first document, RLS, and CAS contracts inside AIBase only after the
identity compatibility gate passes.

**Independent Test**: Two employee test identities and two devices complete isolation, first/retry
save, stale-revision pause, core-loop, backup, offline, and reconnect scenarios with synthetic data.

- [ ] T018 [US2] On the compatible branch only, apply
  supabase/migrations/20260816090000_log_note_documents.sql and
  supabase/migrations/20260816170000_require_expected_revision.sql in order to the empty AIBase
  branch; record versions/status only in PROJECT_BOARD.md
- [ ] T019 [US2] Prove anonymous reads and save RPC execution are denied, an authenticated first save
  creates revision 1, retry is idempotent, and server getUser accepts the internal token; record only
  pass/fail in PROJECT_BOARD.md
- [ ] T020 [US2] With two employee test sessions, prove bidirectional table/RPC isolation and distinct
  account-scoped local/attachment namespaces; record only pass/fail in PROJECT_BOARD.md
- [ ] T021 [US2] With one employee on two devices, prove refresh/read, revision increment,
  stale-revision pause, explicit recovery, and zero silent overwrite; record only pass/fail in
  PROJECT_BOARD.md
- [ ] T022 [US2] Complete create, browse, search, edit/delete, JSON/Markdown backup, sign-out/repeat
  sign-in, authenticated offline use, and reconnect using the smoke steps in
  ops/catpaw-internal-pilot.md
- [ ] T023 [US2] Run the relevant existing cloud/account/backup unit tests plus PWA checks from
  e2e/run-pwa.mjs and confirm src/app/cloud-document-client.js, src/app/log-note-data-provider.js,
  and backup formats require no owner or payload migration

## Phase 5: User Story 3 - Operate a traceable and reversible internal release (Priority: P1)

**Goal**: Produce one reproducible CatPaw release with safe readiness, logs, report verification, and
known-good recovery.

**Independent Test**: One clean pushed revision builds in CatPaw, serves HTTPS/root/readiness, passes
the synthetic report and internal acceptance, contains no sensitive log material, and can select its
known-good predecessor after the first verified release.

- [x] T024 [US3] Reconcile .catpaw/catpaw_deploy.yaml and src/app/api/healthz/route.js with
  specs/006-internal-pilot/contracts/healthz.md, preserving Node 20, deterministic commands, port
  3100, fixed response, and no environment values
- [x] T025 [US3] Rewrite ops/catpaw-internal-pilot.md around the Hackathon CatPaw + AIBase + Meituan
  SSO path, explicit user actions, compatibility gate, clean source, logs, smoke, and rollback; remove
  the obsolete public-Supabase/email-password limitation
- [x] T026 [P] [US3] Keep scripts/verify-report-api.mjs limited to same-origin synthetic status,
  headers, filename, and byte-length validation without printing or persisting the response body
- [x] T027 [US3] Pass tests/internal-deployment.test.mjs and cross-check
  ops/catpaw-internal-pilot.md against specs/006-internal-pilot/{spec.md,plan.md,research.md,quickstart.md}
  and the Hackathon article ID without copying internal article content

## Final Phase: Integration, Evidence, Release, and Internal Deployment

- [x] T028 Review specs/006-internal-pilot/checklists/internal-release.md as a requirements-quality
  gate; reviewer-owned markers remain unchanged by implementation
- [x] T029 Run all focused auth, deployment, cloud, backup, report, and browser/PWA regressions and
  inspect failures for false positives or stale snapshots
- [x] T030 Run npm run design:check and responsive 320/390/426px review for the changed account gate
  and Account settings without overwriting unrelated output/**
- [x] T031 Run the complete npm run check quality gate and git diff --check for the integrated
  candidate
- [x] T032 Independently review the final LN-037 diff against the declared write set, spec, plan,
  Constitution, PROJECT_BOARD.md, and the CatPaw/AIBase/SSO evidence boundary
- [x] T033 Record returned local implementation evidence and every remaining real-environment check
  in PROJECT_BOARD.md without marking LN-037 Accepted
- [x] T034 Review and stage only the explicit release paths from specs/006-internal-pilot/plan.md;
  inspect git diff --cached --name-status and the complete staged diff, excluding .env.local,
  private/, research/, review-*, output/**, credentials, identifiers, and internal document exports
- [x] T035 Create and push the already authorized traceable LN-037 release commit, record its revision
  in PROJECT_BOARD.md, and do not tag, merge, publish publicly, or include unrelated user changes
- [x] T036 Clone the exact pushed revision into a temporary clean directory, confirm empty git status
  and excluded paths, and reproduce npm ci plus npm run build
- [ ] T037 With the authorized user, open the clean clone in CatPaw, verify the approved build-variable
  control, enter only AIBase browser-public configuration plus internal auth mode, and deploy
  .catpaw/catpaw_deploy.yaml; stop without a hardcoded workaround if any control is absent
- [ ] T038 Register the exact CatPaw HTTPS callback in the SSO/Auth control plane, then execute
  root/readiness, repeat sign-in, two-identity, two-device, core-loop, offline/reconnect, report, and
  log review from ops/catpaw-internal-pilot.md
- [ ] T039 Verify the safe known-good redeploy/rollback control, then record the internal URL,
  project/deploy ID, exact revision, redacted results, and unresolved approvals in PROJECT_BOARD.md;
  real personal notes remain blocked until the controller accepts every data-boundary gate
- [x] T040 Add the reviewed deployment-only `@mtfe/hlb` registration worker, bounded startup
  watchdog, and fixed `/monitor/alive` OCTO probe in package.json, package-lock.json,
  ops/register-cargo-service.cjs, ops/start-cargo.sh, src/app/monitor/alive/route.js, and
  tests/internal-deployment.test.mjs; keep ordinary app runtime and UI behavior unchanged
- [x] T041 Push the exact routing candidate to `master`, deploy it through the assigned AppKey's test
  HulkPlus/Cargo template, and observe a normal OCTO HTTP node without copying node addresses or
  platform environment values into evidence
- [x] T042 Create the Oceanus main domain, use Cargo to generate/backfill the swimlane domain, and
  verify the observed HTTPS root, `/monitor/alive`, and `/api/healthz`; do not infer the URL from the
  naming rule or mark SSO/data acceptance complete

## Phase 6: Public GitHub to Personal Tencent Delivery

- [x] T043 Reconcile the user's later public-runtime decision into
  specs/006-internal-pilot/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/} without
  deleting or weakening the CatPaw internal path
- [x] T044 Add a focused requirement-quality checklist for the public dependency, GitHub trigger,
  immutable artifact, SSH trust, activation, readiness, rollback, and no-deletion boundaries
- [x] T045 Add failing static and behavioral contracts in tests/tencent-deployment.test.mjs for root
  public installability, isolated CatPaw dependency resolution, GitHub job gating/concurrency, Next
  standalone packaging, systemd runtime, checksum/path validation, atomic switch, and rollback
- [x] T046 Move `@mtfe/hlb` from package.json/package-lock.json into
  ops/catpaw/{package.json,package-lock.json}; keep the existing registration entrypoint and make both
  CatPaw manifests install the isolated package explicitly
- [x] T047 Update .github/workflows/quality.yml so public root `npm ci` runs the complete gate with
  temporary E2E output, and only a successful GitHub `master` push can enter the protected serialized
  non-cancelling Tencent deployment job
- [x] T048 Enable Next.js standalone output and add ops/build-tencent-release.sh to package the
  traced server, static/public assets, exact revision metadata, and SHA-256-ready archive without
  copying CatPaw-only dependencies or runtime secrets
- [x] T049 Add ops/deploy-tencent-release.sh, ops/start-tencent-server.sh,
  ops/sudoers/log-note-deploy, the standalone ops/systemd/log-note.service contract, and
  ops/tencent-github-deployment.md for fixed-path checksum validation, safe extraction, atomic
  activation, loopback readiness, and exact-prior rollback (including the first legacy release) with
  no automated release deletion
- [x] T050 Pass focused deployment contracts, a clean public-registry `npm ci`, standalone artifact
  inspection, existing internal deployment tests, and `git diff --check`; then run the complete
  `npm run check` gate without staging unrelated output or OAuth work
- [x] T051 Independently compare the final delivery diff with the spec, checklist, Constitution,
  workflow security boundary, and current server layout; record local evidence in PROJECT_BOARD.md
  without marking external GitHub or rollback acceptance complete
- [ ] T052 After explicit push/control-plane authorization, configure the GitHub production
  environment and restricted CVM deploy identity, install the fixed server controls, push the reviewed
  commit, observe one real GitHub deployment, and rehearse rollback before calling CI/CD operational

## Dependencies and Execution Order

- T001–T004 establish truth sources, product scope, and write ownership before application edits.
- T005–T008 define the red contract and block T009–T013.
- T009–T014 complete local User Story 1 behavior and unblock the real SSO probe.
- T015–T017 require user control-plane action. An incompatible T017 blocks T018 and returns the same
  LN-037 task to owner-model planning.
- T018–T023 complete User Story 2 and block release promotion.
- T024–T027 complete User Story 3 locally.
- T028–T033 block staging; T034–T036 block CatPaw upload.
- T037 and T041 require the assigned AppKey control plane. T041 blocks T042; a real T042 HTTPS origin
  blocks T038. T039 records only observed evidence after the SSO/data and recovery gates also pass.
- T043–T044 define the revised public lane; T045 must fail before T046–T049 implementation. T050 and
  T051 block any push or server mutation. T052 remains a separate external authorization/evidence
  gate and does not block returning the repository implementation.

## Parallel Opportunities

- T005, T006, and T007 target different regression files and can be reviewed independently, though
  one main-checkout writer applies edits.
- After T014, read-only reviewers may audit the identity gate and operations guide while the
  authorized user completes T015–T017.
- T026 can be reviewed independently of the manifest/readiness reconciliation in T024.
- No parallel operation may edit the Git index, AIBase workspace, SSO application, CatPaw project, or
  PROJECT_BOARD.md.

## Implementation Strategy

1. Complete the internal sign-in vertical slice without changing signed-in recording behavior.
2. Pause at the real identity compatibility gate; branch safely if UUID ownership is not proven.
3. Reuse schema/RLS/CAS only after compatibility, then prove the core loop with synthetic identities.
4. Close configuration, logging, report, source-traceability, and recovery gates.
5. Deploy one clean candidate and accept only evidence observed in the real internal environment.

## Prohibited Without Additional Authorization

- Tags, merges, PR creation, push, public launch announcement, live Tencent control-plane mutation,
  destructive workspace/data/release deletion, reset, history rewrite, OKR modification, or worktree
  merge. Repository implementation of the authorized delivery path is allowed; T052 remains separate.
- Real personal-note migration, remote AI, Google integrations, new dependencies, claim-owned schema,
  multi-instance operation, homepage controls, or required recording fields.
