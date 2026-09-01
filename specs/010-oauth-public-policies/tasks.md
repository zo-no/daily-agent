---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: OAuth Public Policies

**Board Item**: `[LN-067]`
**Input**: Feature artifacts from `/specs/010-oauth-public-policies/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-067`, `PROJECT_BOARD.md`, `product.md`, feature numbering, Google official
  release requirements, the current provider boundary, and `git status`
- [x] T002 Confirm the exact write set, exclusions, single-writer ownership, no deployment/publication
  permission, and preservation of unrelated `output/playwright/**` changes in `plan.md`
- [x] T003 Add the narrow durable public-policy support admission to `product.md` without changing
  Calendar authority, storage, or core recording behavior

## Phase 2: Failing Regression and Contract Coverage

- [x] T004 [P] [US1] Add `tests/public-policies.test.mjs` for stable public paths, structured bilingual
  content, source scope/window alignment, material privacy/terms disclosures, and legal-identity guard
- [x] T005 [P] [US1] Add a `public OAuth policy pages` journey to `e2e/run-mobile.mjs` for signed-out
  direct access, semantics, cross-links, 44 px targets, keyboard focus, and 320/390/1280 overflow
- [x] T006 Run the focused unit/browser tests and record their expected pre-implementation failures;
  do not update unrelated screenshots or `output/playwright/**` evidence

## Phase 3: User Story 1 - Understand the app before signing in (P1)

**Goal**: A reviewer or prospective user can identify Log Note and understand Calendar use publicly.

**Independent Test**: A clean browser opens `/about` without an account gate or provider dependency.

- [x] T007 [US1] Add the exact public-route allowlist and existing authenticated provider chain in
  `src/app/app-providers.js` and integrate it from `src/app/layout.js`
- [x] T008 [US1] Add shared identity, route, effective-date, and About content to
  `src/lib/public-policies.mjs`
- [x] T009 [US1] Add the shared semantic shell/styles in `src/app/public-page-shell.js` and
  `src/app/public-pages.css`, then implement `src/app/about/page.js`
- [x] T010 [US1] Run focused unit/browser tests and verify non-public account-gate behavior remains
  protected

## Phase 4: User Story 2 - Review Google data handling (P1)

**Goal**: A user can make an informed Calendar authorization decision from an accurate policy.

**Independent Test**: `/privacy` renders every contract topic in English and Chinese while signed out.

- [x] T011 [US2] Add privacy content aligned with current auth/Calendar/storage behavior to
  `src/lib/public-policies.mjs`
- [x] T012 [US2] Implement `src/app/privacy/page.js` with public metadata and shared rendering
- [x] T013 [US2] Verify scope/read-window constants, unmarked-event protection, token/cache/reference
  statements, Limited Use, disconnect/revocation/deletion, and no user-data initialization through
  `tests/public-policies.test.mjs` and the browser journey

## Phase 5: User Story 3 - Review service terms (P1)

**Goal**: A user can review a conservative service agreement without unsupported legal claims.

**Independent Test**: `/terms` renders all contract sections in both languages while signed out.

- [x] T014 [US3] Add independent-project Terms content and unsupported-claim guards to
  `src/lib/public-policies.mjs` and `tests/public-policies.test.mjs`
- [x] T015 [US3] Implement `src/app/terms/page.js` with public metadata and shared rendering
- [x] T016 [US3] Add secondary `/about`, `/privacy`, `/terms` links to `src/app/auth-provider.js` and
  `src/app/settings/settings-page.js`, with scoped styles in `src/app/auth-gate.css` and
  `src/app/settings-dialog.css`

## Final Phase: Integration, Evidence, and Return

- [x] T017 Run focused unit and `public OAuth policy pages` browser regressions and inspect failures
- [x] T018 Run `npm run design:check` and complete 320/390/1280 responsive/visual review
- [x] T019 Run complete `npm run check` and `git diff --check`
- [x] T020 Review the final diff against the declared write set, spec, plan, Constitution, and LN-067;
  confirm unrelated dirty changes remain untouched
- [x] T021 Update `PROJECT_BOARD.md` with returned evidence and remaining legal, production-URL,
  Google Cloud publication/verification, and real-account checks; do not mark Accepted

## Dependencies and Execution Order

- T001–T003 block application edits.
- T004–T006 define the failing contract before T007–T016.
- T007 provider routing blocks public browser acceptance for every story.
- T008–T010 deliver US1; T011–T013 deliver US2; T014–T016 deliver US3.
- T017–T021 block return to the controller.

## Implementation Strategy

1. Establish one exact public route and provider boundary through About.
2. Add accurate privacy disclosure from existing implementation truth.
3. Add conservative Terms and secondary discoverability links.
4. Run focused, responsive, full-gate, diff, and board evidence checks.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OAuth production publication, OKR modification, or worktree merge.
- New dependencies, migrations, Calendar scopes/behavior, network data boundaries, homepage controls,
  required recording fields, or broad refactors outside this spec.
