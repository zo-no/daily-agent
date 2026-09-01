---
description: "Dependency-ordered Hero-triggered composer content-improvement implementation"
---

# Tasks: Hero-Triggered Composer Content Improvement

**Board Item**: `LN-078`
**Input**: Feature artifacts from `specs/013-composer-content-improvement/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, v1 contract, Constitution check,
clear board readiness and local implementation authorization

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-078`, `product.md`, `ARCHITECTURE.md`, `DESIGN.md`, formal page/motion rules,
  current composer/Agent/AI contracts, permissions, evidence, and `git status`
- [x] T002 Declare the one-writer Change Contract, exact write set, exclusions, public contract,
  invariants, verification, rollback, and open evidence before application edits
- [x] T003 [P] Add the durable `LN-078` admission to `product.md` and reconcile the outer-traveler versus
  composer-local Hero decision in `DESIGN.md` and the formal page specification

## Phase 2: Failing Regression and Contract Coverage

- [x] T004 [P] [US1] Add strict request/response, no-truncation bounds, fingerprint, Unicode/Markdown,
  empty/identical, unknown-field, prompt-injection treatment, and fixed fidelity/advice instruction
  tests in `tests/content-improvement-model.test.mjs`
- [x] T005 [P] [US3] Add exact six-field transport, Bearer-only auth, one-fetch, abort/timeout/status,
  echo/stale validation, and error-redaction tests in `tests/content-improvement-provider.test.mjs`
- [x] T006 [P] [US3] Add origin/content-type/body/auth/rate/input/timeout/invalid/one-call/private-response
  route tests in `tests/ai-content-improvement-route.test.mjs`
- [x] T007 [P] [US1] Extend `tests/agent-review-runtime.test.mjs` and `tests/project-structure.test.mjs`
  for the fixed `content-improvement` capability and canonical route/module boundary
- [x] T008 [P] [US1–US3] Add the ordinary-only Hero, empty zero-request, pending dedupe, same-area review,
  cancel/use/Done, stale/error, Escape/focus, 44px, and 320/390/426/1280px scenario to `e2e/run-mobile.mjs`
- [x] T009 Run the focused suites from `quickstart.md` and record expected pre-implementation failures
  without changing unrelated screenshots or snapshots

## Phase 3: User Story 1 - Improve One Free-Text Draft by Tapping Hero (Priority: P1)

**Goal**: One optional Hero tap produces one strictly bounded candidate inside the ordinary composer.

**Independent Test**: Non-empty ordinary text causes one request and one in-place candidate; empty,
structured, and periodic cases make zero requests.

- [x] T010 [US1] Implement request/response schemas, fingerprinting, sanitizer, candidate normalizer,
  and prompt-safety rules in `src/lib/content-improvement-model.mjs`
- [x] T011 [US1] Register `content-improvement` as the sixth fixed one-call/no-retry/no-tool/no-memory
  capability in `src/mastra/index.mjs`
- [x] T012 [US1] Implement the authenticated bounded business route in
  `src/lib/content-improvement-route.mjs` and thin Route Handler in `src/app/api/records/improve/route.js`
- [x] T013 [US1] Implement the strict browser transport and public-safe error classes in
  `src/lib/content-improvement-provider.mjs`
- [x] T014 [US1] Pass a memoized Provider/account-generation boundary from `src/app/page.js` into
  `src/app/record-composer.js` without changing the existing save or outer Agent lifecycle
- [x] T015 [US1] Mount `AgentAppearance` only in the ordinary writing leaf, implement idle/pending/error
  activation and empty-focus behavior in `src/app/record-composer.js`, and add localized copy in
  `src/lib/i18n.mjs`

## Phase 4: User Story 2 - Compare, Use, or Cancel Without Automatic Saving (Priority: P1)

**Goal**: Candidate review is compact, reversible, and never persists before existing `Done`.

**Independent Test**: Toggle original/candidate, cancel with byte-identical draft/data, then use and
prove only draft changes until `Done` performs the existing save.

- [x] T016 [US2] Add session-only original/candidate state, read-only same-textarea preview, explicit
  use/cancel, identical-candidate handling, and `Done` ambiguity guard in `src/app/record-composer.js`
- [x] T017 [US2] Add the subordinate Hero placement and one wrap-safe compact action group to
  `src/app/entry-composer.css` with 44px targets and no writing/resize/toolbar overlap
- [x] T018 [US2] Preserve formatting, details, attachment, delete, close/discard, keyboard save, and
  existing `saveEntry` behavior outside proposal review using the focused browser regression

## Phase 5: User Story 3 - Reject Stale or Unsafe Results (Priority: P1)

**Goal**: No late, mismatched, failed, or malicious result can reach the draft or persistence path.

**Independent Test**: Resolve held requests after source/target/account/lifecycle/new-request changes
and exercise all public errors; every result is ignored with zero write.

- [x] T019 [US3] Abort and invalidate on source, target, account generation, template, close, newer
  request, and component cleanup in `src/app/record-composer.js`
- [x] T020 [US3] Enforce strict server/browser binding echoes, output allowlist, fixed fidelity/advice
  instructions, explicit inert preview, and public-safe error mapping in the three
  `content-improvement-*` modules
- [x] T021 [US3] Run model/provider/route/runtime/browser focused suites and verify zero calls on empty,
  zero duplicate requests, zero stale preview, zero pre-`Done` persistence, and zero private error leakage

## Final Phase: Integration, Evidence, and Return

- [x] T022 [P] Update `ARCHITECTURE.md`, `docs/设计规范/规范/交互/反馈与动效规范.md`,
  `src/lib/public-policies.mjs`, `tests/public-policies.test.mjs`, `specs/README.md`, and this package
  only for the verified six-capability, data-transfer disclosure, and composer contract
- [x] T023 Run all focused checks in `quickstart.md` and inspect failures for false positives or
  accidental dependence on unrelated dirty files
- [x] T024 Run `npm run design:check` and inspect 320/390/426/1280px screenshots for writing priority,
  Hero weight, no conversation/panel, target geometry, focus, error, and reduced motion
- [x] T025 Run `npm run check` and `git diff --check`; distinguish scoped failures from the full
  repository gate without marking the feature Returned if required gates remain red
- [x] T026 Review the final diff against the declared write set, spec, plan, checklist, Constitution,
  and board acceptance; preserve all unrelated dirty and user-owned changes
- [x] T027 Attempt the required sigo review, then—because no sigo skill or executable is available in
  this session—perform the same completeness, accuracy, constraints, omissions, and executability
  checklist explicitly and correct all in-scope findings
- [x] T028 Record focused/full counts, visual evidence, zero-write/stale proof, rollback, and remaining
  real-Provider/latency/14-day evidence in `PROJECT_BOARD.md` without committing, pushing, or deploying

## Dependencies and Execution Order

- T001–T003 block application edits.
- T004–T009 define failing contracts before T010–T020.
- T010–T013 establish pure/server/browser boundaries before T014–T020 integrate UI.
- T014–T018 are serialized because `page.js`, composer state, and CSS share one interaction lifecycle.
- T019–T021 close stale/error safety before any full-gate claim.
- T022 documents verified behavior; T023–T028 block Return.
- `[P]` marks file independence only; it does not authorize another writer.

## Prohibited Without Explicit Authorization

- Commit, push, PR, publication, deployment, destructive deletion, reset, history rewrite, OKR change,
  worktree merge, new dependency, schema/migration, persistent AI state, generalized chat, template AI,
  structured/periodic rewriting, background request, automatic save, or unrelated cleanup.

## Execution Evidence

- Failing-first: the new contract suites initially failed on missing `content-improvement` modules and
  the missing sixth Mastra capability, as expected; no unrelated snapshot was updated.
- Focused: model/provider/route/runtime/project/policy checks passed `28/28`; the final isolated browser
  scenario passed `1/1`, including empty/over-limit zero-request, pending dedupe, stale/error/Escape
  zero-write, exact six-field payload, same-paper compare/use/cancel, structured/periodic isolation,
  keyboard focus, and `320/390/426/1280px` geometry.
- Full: `npm run check` passed design specs `11/11`, Node tests `249/249`, browser scenarios `35/35`,
  production PWA build/installability/authenticated offline cache/persistence/controlled update, and
  `git diff --check`. The build retains the pre-existing Mastra dynamic-dependency warning.
- Visual: four responsive screenshots were generated in a temporary evidence directory and inspected
  for Hero weight, text clearance, one compact action line, disabled-save clarity, and no conversation
  or panel. They were not added to the dirty working tree.
- Review fallback: the current session exposed neither a sigo skill nor a `sigo` executable. The final
  explicit review found and corrected stale five/six-capability wording, the focused E2E command,
  disabled-state clarity, candidate Hero wording, keyboard order, privacy detail, Escape focus, and
  periodic-editor isolation.
- Open evidence: one non-sensitive real configured-Provider result, three real latency samples, the
  owner’s final `390px` visual judgment, and the 14-day use/cancel/rewrite observation remain required
  before `Accepted`. Rollback removes the composer mount/styles/provider/route/model/capability/copy;
  no schema, migration, stored proposal, backup conversion, or data cleanup exists.
