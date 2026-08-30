# Tasks: In-page Agent Diary Review

**Board Item**: `LN-074`
**Input**: Feature artifacts from `/specs/003-agent-diary-review/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, assigned rework scope

## Phase 1: Reconcile and Guard

- [x] T001 Reconcile LN-074, product/design truth, dirty working tree, dependencies, and current evidence in `PROJECT_BOARD.md`, `product.md`, `DESIGN.md`, and `git status`
- [x] T002 Confirm one-writer ownership, write set, exclusions, and rollback in `specs/003-agent-diary-review/plan.md`
- [x] T003 Add durable Agent admission and design decisions in `product.md`, `DESIGN.md`, and matching `设计规范/规范/` files

## Phase 2: Contract and Failing Regression

- [x] T004 [P] Add Agent item/reply normalization and fallback tests in `tests/agent-review-model.test.mjs`
- [x] T005 [P] Add authenticated bounded route tests in `tests/ai-agent-review-route.test.mjs`
- [x] T006 [P] Replace the old helper navigation assertions with in-page Agent journeys in `e2e/run-mobile.mjs`
- [x] T007 Run focused new tests and record expected failures before source implementation

## Phase 3: User Story 1 - Wake and Anchor

- [x] T008 [US1] Implement allowlisted item normalization and local fallback in `src/lib/agent-review-model.mjs`
- [x] T009 [US1] Implement authenticated structured analysis in `src/lib/agent-review-route.mjs` and `src/app/api/organize/agent/route.js`
- [x] T010 [US1] Implement browser provider, cancellation, and fallback in `src/lib/agent-review-provider.mjs`
- [x] T011 [US1] Add row insertion hooks and active-row semantics in `src/app/home-record-views.js`
- [x] T012 [US1] Replace the helper link with Home session activation, row anchoring, and completion in `src/app/page.js`

## Phase 4: User Story 2 - Row Conversation

- [x] T013 [US2] Implement row-local question/casual reply UI and accessibility in `src/app/agent-diary-review.js`
- [x] T014 [US2] Add reply-mode request normalization and provider behavior in `src/lib/agent-review-route.mjs` and `src/lib/agent-review-provider.mjs`
- [x] T015 [US2] Add localized Agent copy in `src/lib/i18n.mjs`

## Phase 5: User Story 3 - Explicit Writes and Filing

- [x] T016 [US3] Implement append/new-record/keep/category/undo actions through `commitData` in `src/app/page.js`
- [x] T017 [US3] Preserve unrelated record fields and stop sessions on date/mode/tool changes in `src/app/page.js`
- [x] T018 [US3] Verify explicit-write invariants with `tests/agent-review-model.test.mjs` and `e2e/run-mobile.mjs`

## Phase 6: Visual, Offline, and Evidence

- [x] T019 Add open-paper row conversation, traveling Agent, focus, responsive, and reduced-motion styles in `src/app/home-timeline.css`
- [x] T020 Add Agent route/assets to the offline shell where needed in `public/sw.js` and verify no session persistence
- [x] T021 Run focused unit/route tests and `npm run design:check`
- [x] T022 Run responsive E2E/PWA review and capture Agent idle/question/category/complete evidence in `output/`
- [x] T024 Rework the reference-paper visual narrative: explicit wake copy, perceptible scan state, date-level result summary, local source underline, short annotation bracket, question/progress row, equal actions, and completion return state
- [x] T025 Capture idle/scanning/question/category/complete 390px evidence and regress keyboard-focus versus Agent-active visual semantics
- [x] T026 Stack category confirmation actions vertically on mobile while preserving horizontal desktop layout and 44px targets
- [x] T027 Stack every row-local Agent action vertically on mobile while preserving the compact horizontal desktop layout and 44px targets
- [x] T028 Let the annotation's closing hand-drawn rule replace the active record row divider so the row and review read as one paper block
- [x] T029 Remove the adjacent fixed-record divider while a row annotation owns the paper boundary, leaving one hand-drawn separator
- [x] T030 Make follow-up questions progressive: show only reply and keep-original before an answer, then reveal lightweight vertical resolution actions without menu dividers
- [x] T031 Keep the traveling figure anchored above the annotation reply controls so it points to the source record without covering Send or the input line
- [x] T032 Redesign the annotation from an image-generated margin-note concept: separate stop/progress, use a three-sided short bracket, remove long input and closing rules, and reveal Send only after typing
- [x] T023 Run full `npm run check` and `git diff --check`
- [x] T033 Review final diff against spec/plan/Constitution and record returned evidence/manual checks in `PROJECT_BOARD.md`

## Phase 7: Screenshot-led Mobile Composition Rework

- [x] T034 Reconcile the marked 390px screenshot and update requirements, plan, checklist, and active feature pointer in `specs/003-agent-diary-review/` and `.specify/feature.json`
- [x] T035 [P] Add failing mobile composition assertions for header gap, annotation alignment, helper-slot collapse, bordered actions, horizontal utility labels, and labeled export in `e2e/run-mobile.mjs`
- [x] T036 [US4] Tighten closed-calendar spacing and mobile utility-rail composition in `src/app/home-header.css` and `src/app/home-timeline.css`
- [x] T037 [US4] Align the Agent annotation to the record body and give resolution actions explicit primary/secondary control boundaries in `src/app/home-timeline.css`
- [x] T038 [US4] Replace the export stamp presentation with a compact localized rail label/node in `src/app/page.js`, `src/app/home-timeline.css`, and `src/lib/i18n.mjs`
- [x] T039 Run focused Agent mobile regression and capture refreshed 390px Chinese question/category evidence in `output/playwright/`
- [x] T040 Run `npm run design:check`, responsive review, `npm run check`, and `git diff --check`
- [x] T041 Record returned evidence and remaining real-device judgment in `PROJECT_BOARD.md` without marking LN-074 Accepted

## Phase 8: Screenshot-led Icon and Cohesion Rework

- [x] T042 Reconcile the latest marked 390px screenshot and update LN-074 requirements, plan, requirements checklist, research decision, quickstart, design truth, and board scope in `specs/003-agent-diary-review/`, `DESIGN.md`, matching `设计规范/规范/` files, `product.md`, and `PROJECT_BOARD.md`
- [x] T043 Add failing mobile visual-contract assertions for icon-only Search / Calendar / Settings / Export controls, no active Diary traveller, no dashed source underline, a short annotation accent, and one segmented 44px action group in `e2e/run-mobile.mjs`
- [x] T044 [US4] Replace visible utility/export rail text with accessible hand-drawn icon controls in `src/app/home-header.js`, `src/app/home-header.css`, `src/app/page.js`, and `src/app/home-timeline.css`
- [x] T045 [US4] Remove the active Diary traveller state/rendering and rejected source underline while preserving row attachment, scroll reveal, `aria-current`, keyboard focus, and Plan Agent isolation in `src/app/page.js` and `src/app/home-timeline.css`
- [x] T046 [US4] Replace the tall bracket and separate mobile action blocks with one short local accent and compact segmented 44px action group in `src/app/home-timeline.css`
- [x] T047 Run focused Diary Agent, home rail, and Plan Agent regression and capture refreshed Chinese 390px evidence in `output/playwright/`
- [x] T048 Run `npm run design:check`, unit tests, full `npm run check`, and `git diff --check`
- [x] T049 Record returned evidence and remaining real-device/model judgment in `PROJECT_BOARD.md` without marking LN-074 Accepted

## Phase 9: Right-side Icon Lane Correction

- [x] T050 Reconcile the latest marked 390px screenshot and specify that Search / Calendar / Settings / Export icons sit in the lane immediately right of the binding line rather than centered over it
- [x] T051 Add failing cross-width geometry assertions for the right-side utility targets/icons and export glyph in `e2e/run-mobile.mjs`
- [x] T052 Apply the CSS-only right-side placement correction in `src/app/home-header.css` and `src/app/home-timeline.css`
- [x] T053 Run focused home rail, date header, Diary Agent, and Plan Agent regression and inspect the refreshed 390px evidence
- [x] T054 Run the full quality gate and return updated evidence to `PROJECT_BOARD.md` without marking LN-074 Accepted

## Phase 10: Annotation Type Hierarchy Correction

- [x] T055 Reconcile the latest marked 390px screenshot and specify `question > category > reply hint/action` while preserving the right-side icon lane
- [x] T056 Add failing computed-style regression assertions for prompt/category/placeholder/action sizing, quiet placeholder ink, 16px mobile input, and existing 44px targets
- [x] T057 Apply a CSS-only type/color correction in `src/app/home-timeline.css` without changing Agent behavior, data, rail geometry, or interaction steps
- [x] T058 Run the focused Diary Agent regression and inspect the refreshed Chinese 390px evidence
- [x] T059 Run the full quality gate and return final evidence to `PROJECT_BOARD.md` without marking LN-074 Accepted

## Phase 11: Annotation Alignment Correction

- [x] T060 Reconcile the latest marked 390px screenshot and define shared reading, gutter, and right-edge axes for the row annotation
- [x] T061 Add failing computed-geometry assertions for prompt/category/reply/action alignment, stop/accent alignment, action right edge, and the paired 4px gap
- [x] T062 Apply a Diary-only CSS correction for the mobile stop target, reply accent, reply text inset, and category spacing
- [x] T063 Run focused Diary Agent regression and inspect the refreshed Chinese 390px screenshot
- [x] T064 Run Diary/Plan isolation regression, the full quality gate, and return final evidence to `PROJECT_BOARD.md`

## Phase 12: Source Hierarchy and Proximity Correction

- [x] T065 Reconcile the latest marked 390px screenshot and define the source-record hierarchy, real `.entry-content` axis, and three vertical proximity gaps
- [x] T066 Add failing computed-style/geometry assertions for source-versus-prompt contrast, actual text-edge alignment, and category/reply/actions/next-record spacing
- [x] T067 Apply a Diary-mobile CSS-only correction while preserving the annotation right edge, right-side icon lane, 44px actions, and Plan Agent geometry
- [x] T068 Run the focused Diary Agent regression and inspect refreshed English and Chinese 390px evidence
- [x] T069 Run Diary/Plan isolation, design validation, the full quality gate, and return evidence to `PROJECT_BOARD.md`

## Phase 13: Perceptible Annotation Role Correction

- [x] T070 Accept the product-owner rejection that numeric size changes alone were visually imperceptible
- [x] T071 Give Diary Agent prose a distinct muted Serif annotation role, reduce action type, move the gutter closer, and halve the top reserve without moving the source text or right rail
- [x] T072 Re-audit the actual 390px page against mature inline-comment and margin-note patterns; reject the competing Serif voice, blue-heavy summary, left-side close gutter, and full-width segmented action block
- [x] T073 Rebuild the mobile Diary annotation with a 13px Sans prompt, Mono role metadata, short source marker, upper-right progress/close, compact category chip, and borderless right-aligned 44px text actions while preserving the right icon lane and Plan Agent
- [x] T074 Update visual-contract assertions, run focused Diary/Plan regressions, inspect refreshed English/Chinese 390px screenshots, and complete the repository quality gate in isolated temporary output directories
- [x] T072 Add a computed font-family regression and refresh 390px Chinese/English evidence
- [x] T073 Run Diary/Plan isolation and the complete quality gate, then record Rework 8 evidence

## Phase 14: Mobile Density and Empty-Space Correction

- [x] T075 Reconcile the latest 390px screenshots and identify stacked header, active-row, reply/action, resolved-action, and fixed-record spacing
- [x] T076 Compact the active Diary source row and closed-date section gap without changing source typography or right-rail placement
- [x] T077 Share the reply row with a lone secondary action and collapse three resolved actions into one 390px row while retaining 44px targets
- [x] T078 Remove the active-review fixed-record `32px + 32px` separation and replace it with one 12px transition
- [x] T079 Update density assertions and refresh question/category/resolved/Chinese 390px evidence
- [x] T080 Run Diary/Plan isolation, design validation, the complete quality gate, and record Rework 10 evidence without marking LN-074 Accepted

## Phase 15: Community-informed Compact Reading Grid

- [x] T081 Search SkillHub and authoritative layout/accessibility articles for mobile proximity, information density, and target-area guidance
- [x] T082 Convert the latest marked 390px gaps into measurable header, gutter, row, action, and fixed-tool geometry
- [x] T083 Bottom-anchor the active title/summary, compact the time/content grid and ordinary/fixed rows, and preserve the right icon lane
- [x] T084 Merge the two category actions into the reply row and reduce the fixed-tool visual slot without shrinking or overlapping 44px targets
- [x] T085 Add geometry regressions and inspect refreshed English/Chinese 390px question/category/resolved evidence
- [x] T086 Run Diary/Plan/date/rail isolation, design validation, the full quality gate, and record Rework 11 evidence without marking LN-074 Accepted

## Phase 16: Reply Usability Correction

- [x] T087 Accept the product-owner finding that Rework 11 met density metrics but made the reply interaction inconvenient
- [x] T088 Restore full reply width and move one/two unresolved actions into one compact row directly below it without changing typography or the right icon lane
- [x] T089 Strengthen the 44px close target with a visible inner glyph surface and reserve prompt clearance
- [x] T090 Replace the same-row regression with 320/390px reply-width, gap, row, close-affordance, overflow, and isolation assertions
- [x] T091 Run design validation and the complete quality gate, record Rework 12 evidence, and keep LN-074 in verification pending product-owner review

## Phase 17: Category Copy De-duplication

- [x] T092 Reconcile the product-owner report that category paths repeat in the prompt and result label
- [x] T093 Add local/remote normalization tests and a focused browser assertion for one generic prompt plus one visible category path
- [x] T094 Change local category fallback copy, normalize remote category prompts, and instruct the remote model not to repeat the rendered path
- [x] T095 Run focused Diary Agent, design, unit, PWA, and full quality-gate checks; capture refreshed English/Chinese category evidence without marking LN-074 Accepted

## Phase 18: Stale Category Queue Resolution

- [x] T096 Reproduce the reported stuck category item in the current 390px page and verify the action is hit-testable rather than covered by another layer
- [x] T097 Add a failing model regression for same-current, valid, duplicate, and unknown Agent review items
- [x] T098 Reconcile returned Agent items against the latest entries/categories before rendering and preserve valid question/note items
- [x] T099 Resolve a category that becomes already-current after rendering with localized no-write feedback and queue advance; preserve valid apply/advance/undo behavior
- [ ] T100 Run design, focused Diary Agent, unit, PWA, full quality-gate, and diff checks; record evidence without marking LN-074 Accepted

## Dependencies and Execution Order

- T003–T007 block implementation; T008–T012 establish US1; US2 builds on the active row; US3 builds on the conversation; T034–T041 refine US4 without changing the prior data or AI contracts; T042–T049 supersede only the Rework 3 mobile visual treatment; T050–T054 correct only the right-side icon placement inside Rework 4; T055–T059 correct only the annotation text hierarchy inside Rework 5; T060–T064 correct only the internal alignment axes inside Rework 6; T065–T069 correct the actual source-text axis, source-versus-Agent hierarchy, and vertical proximity without changing behavior; T096–T100 correct only client queue reconciliation and same-current category resolution without expanding AI scope.
- No parallel writer is authorized; `[P]` marks file independence only.
- Full gate and independent comparison block return.

## Prohibited Without Explicit Authorization

- Commit, push, PR, publish, deploy, destructive deletion/reset/history rewrite, OKR modification, migration, persistent AI schema, or new dependency.
