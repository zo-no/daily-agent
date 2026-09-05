# Quickstart Validation: Book-page Ritual

## Prerequisites

- Run from the repository root with the existing Node.js 22 dependencies installed.
- Do not use real personal records in screenshots or fixtures.
- Preserve the current dirty working tree; LN-076 is a scoped presentation change.

## Focused implementation check

```bash
npm run design:check
E2E_TEST_FILTER="book-page ritual" node e2e/run-mobile.mjs
```

Expected outcome: design sources validate and the focused journey passes for home, populated
timeline, composer, quick save, responsive geometry, focus, reduced motion, and local visual assets.

For Rework 3, also run:

```bash
node --test tests/agent-appearance.test.mjs
E2E_TEST_FILTER="book-page ritual|diary Agent" node e2e/run-mobile.mjs
```

Expected outcome: the selected local line-spirit appearance resolves distinct local assets for all
four supported visual states, unknown IDs fall back to it, the activity stage remains visible during
review, movement stays inside the stage/gutter without content overlap, the 44px button remains, and
reduced motion freezes every state.

For Rework 4, also run the focused category hierarchy journey and inspect the same seeded state at
320, 390, 426, 768, and 1280px. Expected outcome: the domain and first category occupy separate
heading sections; every category title uses regular weight and aligns to the domain's left edge while
its content stays indented; progress remains beside its category; embedded fixed rows measure `52px`
while inputs remain at least 44px; and the last category row and next domain do not produce two
consecutive rule assets.

For Rework 5, run the focused header/rail/Agent journey and the existing date-picker, book-page, and
Diary Agent journeys. Expected outcome: date/weekday is the one primary disclosure; no separate
Calendar rail button remains; Diary uses Search, Settings, a 44px single Diary/Plan toggle, and a
44px single Time/Category toggle in that order; Plan omits only the record-view toggle; no lower
Diary/Plan duplicate remains. The picker still opens, selects, closes with Escape, and returns focus;
the Agent mount has zero flow height after the date context, moves below the complete expanded grid,
shares one visible binding line, leaves exactly one horizontal rule at the ordinary-to-fixed
transition, and creates no blank band or overlap at 320, 390,
426, 768, and 1280px.

For Rework 6, run the same focused header/date journey in Chinese and English. Expected outcome:
the record-view rocker always shows `Time / Category` and the workspace rocker always shows
`Diary / Plan`; one raised paper thumb and current marker move after one click while the outer button,
callback and accessible “switch to …” action stay unchanged. The corrected rail order is Search,
Settings, workspace, then record view; labels do not truncate, each rocker remains at least 44px,
Plan removes only the record-view rocker, reduced motion removes thumb travel, the content directory
begins at least 24px after the complete upper tool stack without
reordering its 44px nodes, and the complete tool stack clears the first calendar date row below 390px.

For Rework 7, run the focused composer journey first with `More` closed, then expanded for both a
new and existing record. Expected outcome: the textarea remains the primary surface; expanding
details exposes a valid controlled region and compacts the writing leaf without reducing it below
160px on mobile; metadata, attachments, and the existing-record danger footer appear in that order;
all affected actions remain at least 44px, keyboard focus is visible, reduced motion is immediate,
and close/save/attachment/delete behavior and exact typed text remain unchanged. Inspect
320/390/426/768/1280px and capture the 390px pair under
`output/playwright/ln-076-composer-rework7/`.

For Rework 8, run the appearance unit test, the focused Diary Agent journey, and the PWA asset check.
Expected outcome after the Rework 14 owner follow-up: grouped Diary has one application-shell Agent
layer while Time has none; mobile 320/390/426/600/700 keeps it inside the safe grouped rail at
top/middle/bottom scroll, desktop 768/1280 keeps one still grouped peek, and Plan/Search/Settings/
composer hide it. No state renders visible idle invitation copy. Idle/scanning/reviewing expose slow 28/20/32-second
grip-and-pause rhythms, complete uses a 30-second return patrol, and calendar/focus/press/background/
reduced-motion pause travel. Empty dates show
the correct temporary note and make no analysis or record write. Static/motion assets are local,
character-only, below the budget, contain no full-height spine line, and remain available offline.
Capture collapsed, scrolled, calendar, and empty-date 390px states under
`output/playwright/ln-076-agent-rework8/`.

For Rework 11, run the existing `LN-076 date-led header` journey. Expected outcome: no Today action
is rendered on local today; selecting another date reveals one localized `Today / 今天` action beside
the date title in Diary and Plan. Its target remains at least 44px at 320/390/426/768/1280px. One
activation returns to today, closes an open picker, focuses the date disclosure, preserves the
Diary/Plan and Time/Category modes, leaves the account payload byte-for-byte unchanged, and creates
no horizontal overflow. Inspect the 390px off-today state before the final gate.

For Rework 12, which supersedes the Rework 5/6 placement expectations above, run the same LN-076
journey plus the day-plan journey. Expected outcome: Diary's
upper tools are Search, Settings, and Time/Category only; exactly one Diary/Plan rocker appears in
the lower quick dock; `Export today / 导出今日日记` sits visibly to the left of the blue record stamp
in one horizontal row. Plan keeps the lower workspace rocker, hides both Diary-only actions, and
retains add-plan. At 320/390/426/768/1280px every target remains at least 44px, labels do not wrap
into a second action band, mode switching and export still work, and no control overlaps content or
the Diary/Plan Agents. Compare the marked owner source and the 390px implementation in one image.

For Rework 13, which supersedes only the Rework 6 record-view appearance, run the same LN-076
date-led journey in Chinese and English. Expected outcome: the upper record-view button shows only
`Category / 分类`; timeline exposes `aria-pressed=false` and a flat quiet surface, one activation
shows `aria-pressed=true`, a raised non-color-only paper surface, and grouped content, and a second
activation restores timeline. The lower Diary/Plan rocker still shows both labels and moves its
thumb. Plan still omits record view. At 320/390/426/768/1280px both controls remain at least 44px,
focus is visible, reduced motion is immediate, labels do not truncate, and no control overlaps the
calendar, directory, Agent, content, or lower actions. Compare the marked source and current 390px
Diary state in one image.

## Rework 14 responsive verification

At `390px`, begin in timeline and verify the structure trigger is fixed, Search and Settings share
the top row, the directory is absent, and record-stream right padding is zero. Activate Category,
verify the existing narrow directory and grouped chapters appear, select a domain and confirm the
directory remains open, then activate the trigger again and confirm timeline reclaims the width.
While grouped, open/close Search, Settings, and Calendar to verify temporary suppression/restoration.
At `700px` repeat the mobile behavior; at `701px` and `1280px` verify the trigger is in the top header,
no vertical directory appears, content width is invariant, and no horizontal overflow exists. Plan
must hide the trigger and directory at every width.

### Corrected Time/Plan, upper workspace, and open lower-dock verification

At `390px` in Time, verify the structure trigger is the only right-edge control and that the binding
background, brush asset, directory, blank strip, and right content reserve are absent. Enter grouped
mode and verify the approximately `92px` rail appears with a restrained approximately `160ms`
transition; a domain jump keeps it open. Open Search, Settings, and Calendar to verify the rail is
temporarily absent while grouped state remains selected.

Verify the upper controls contain one Plan-icon workspace toggle before the Diary-only structure
toggle. Diary is unpressed; one activation enters Plan with a raised `aria-pressed=true` state and
the same control reverses the mode. On mobile, workspace remains fixed above Category on one right
axis; on desktop, Search → Settings → workspace → record view remains inline. Switch to Plan and
confirm export, record view, all rail parts/reserve, and `.day-plan-add` disappear while the workspace
toggle stays put.

Verify the lower action dock contains no Diary/Plan button, label, rocker, capsule boundary, or inset
shadow. Diary shows export plus one blue stamp; Plan shows only the same stamp. The stamp opens the
record composer in Diary and `PlanEditor` in Plan; today defaults to current local time and another
selected date to `09:00`. Plan Agent stays clear of this open dock. Repeat state, focus, reduced-motion,
geometry, and overflow checks at `320/390/426/700/701/1280px`; desktop never mounts a vertical rail or
changes content width.

### Quiet Time and title-tracking verification

At `390px` in Time, verify the Diary Agent and visible idle invitation are absent, the first ordinary
time target shares the shell's basic left edge with the date and `Records` heading, and the fixed
ledger is centered on the complete record stream. At `320–426px`, its first label also joins that
edge; wider fixed ledgers retain the centered readable width. Enter grouped mode and verify one in-range domain control
stays vertically aligned with its matching left chapter while the page scrolls; move that chapter
above the viewport and confirm its control clamps to the directory top without reordering. Confirm the
directory extends to the safe area above the open lower action dock and the grouped Agent does not overlap
fixed inputs. Repeat overflow and target checks at `320/390/426/700px`.

In the same grouped view, every visible domain owns one direct `HH:mm:ss` plus input row inside its
first category. Confirm it follows that category's ordinary records and appears before periodic fields
or later category headings. Enter text in one row and confirm it still saves into that domain's first
category; no global grouped row, extra category picker, persisted field, or network request is
introduced. Verify input/time targets remain at least `44px`, Escape and an empty blur create nothing,
and Time keeps its single aligned global row.

```bash
E2E_TEST_FILTER="LN-076 date-led header|home reference UI" \
E2E_OUTPUT_DIR=/private/tmp/log-note-rework14 \
npm run test:e2e
```

## Manual visual comparison

Compare the existing baseline files:

- `output/playwright/ln-076-baseline-390.png`
- `output/playwright/ln-076-timeline-baseline-390.png`
- `output/playwright/ln-076-composer-baseline-390.png`

with the revised evidence:

- `output/playwright/ln-076-book-page-ritual/ln-076-home-390.png`
- `output/playwright/ln-076-book-page-ritual/ln-076-timeline-390.png`
- `output/playwright/ln-076-book-page-ritual/ln-076-composer-390.png`
- `output/playwright/ln-076-agent-spirit/ln-076-agent-idle-390.png`
- `output/playwright/ln-076-agent-spirit/ln-076-agent-reference-390.png`
- `output/playwright/ln-076-agent-stage/ln-076-agent-{idle,scanning,reviewing,complete}-390.png`
- `output/ln-076-category-secondary-headings/ln-076-category-secondary-headings-390.png`
- `output/ln-076-category-secondary-headings/comparison-390.png`

Review for one coherent journal material, note primacy, an owned first content gap, a believable but
quiet binding gutter, and a composer that feels continuous with the page. Reject ornamental noise,
generic dashboard cards, a bright unrelated action style, or any new recording decision.

For the Rework 3 Agent comparison, place the marked owner reference and the implementation's idle,
reviewing, and complete 390px states in one normalized comparison image. Record findings and
iterations in project-root `design-qa.md`. The final report must say `final result: passed` before
handoff.

For Rework 4, place the marked owner screenshot and the same seeded 390px implementation in one
normalized comparison image. Judge heading hierarchy, section rhythm, typography, color, source
assets, copy, the `52px` fixed-row rhythm, `44px` controls, row alignment, and whether only one rule
explains the Health-to-Learning transition.

For Rework 5, normalize the six marked owner captures and the same collapsed/expanded 390px
implementation into one comparison input. Judge date/view hierarchy, disclosure affordance, unified
rail order, removal of the lower workspace duplicate and Agent spacer, one visible binding line,
calendar-relative placement, coexistence with ordinary/fixed rows, and whether any control or
content is covered.

For Rework 8, place the owner's marked right-spine capture and the same 390px implementation state in
one comparison image. Judge the character/spine relationship, single-line result, available writing
space, tool proximity, and calendar/scroll safety. Record every iteration in `design-qa.md`; do not
mark the result passed from screenshots viewed separately.

## Rework 10 responsive-width verification

Run the focused mobile journey with evidence written outside the shared baseline directory:

```bash
E2E_TEST_FILTER="mobile writing-plane" \
E2E_OUTPUT_DIR=/private/tmp/log-note-pwa-width \
npm run test:e2e
```

At 320/360/389/390px verify Search ends `8±1px` before the brush and has no horizontal overflow.
For the expanded calendar verify all day targets remain at least 44px and the grid right edge is the
farther-right of the normal 8px pre-brush edge or the seven-column minimum. Inspect the 360px Search
and calendar screenshots at PWA-shaped height; reject a large unexplained Search band or an opaque
calendar sheet extending beyond that computed minimum.

## Rework 14 basic-left verification

At `390px` in mobile Time view, compare the marked owner capture with the current Chinese page. The
date, `记录`, every ordinary time value, the direct quick-record time, and fixed labels must begin on
the same paper edge. Computed `left` values must differ by no more than `1px`; long `HH:mm:ss` values
must not extend left of that edge. Ordinary content and quick-record input text must still share one
content start, and their time/input targets must remain at least `44px`.

Switch to Plan and verify the selected date plus every visible hour label share that current shell
edge within `1px` at `320/390/426/700px`; an all-day label uses the same edge when present. Hour and
all-day text are left-aligned, while the plan canvas, empty guidance, and blocks retain the existing
`64px` content axis. Inspect `ln-076-basic-left-plan-390.png`, then run the existing day-plan CRUD
journey to prove create/edit/persist/delete behavior is unchanged.

Switch to grouped Diary and verify every embedded fixed label, including Sleep, shares its domain and
category edge at `320/390/426/700/768/1280px`. The responsive input delta must remain
`152/152/152/160/212/224px`, rows remain `52px`, inputs remain at least `44px`, and overflow is zero.

Run the focused journeys with temporary evidence output:

```bash
E2E_TEST_FILTER="LN-076 basic mobile left edge" \
E2E_OUTPUT_DIR=/private/tmp/ln076-basic-left \
node e2e/run-mobile.mjs
```

Then run the LN-076 date-led and LN-080 inline-edit journeys before the full gate.

## Rework 14 shared-top-rhythm verification

At `320/390/700/768/846/894px`, switch between Time and Category without changing the selected date.
Confirm exactly one `[data-home-date-content-frame]` remains mounted, its collapsed `padding-top` is
`12px`, the two date-to-first-heading gaps differ by at most `1px`, and `.timeline`, `.grouped-view`,
the first `.record-domain`, and `.calendar-view.day-mode` contribute zero top padding. At `768px` and
above, the visible date-to-content gap must remain within `20–36px`.

Switch to Plan at `390px` and confirm it reuses the same frame without introducing a root gap or losing
its remaining-viewport height. Reopen the month picker and verify the frame gap becomes zero. Inspect the
matching-width Time and Category comparisons; source content may differ from the synthetic fixture, so
judge layout, spacing, controls, and assets rather than copy fidelity.

```bash
E2E_TEST_FILTER="LN-076 shared top rhythm" \
E2E_OUTPUT_DIR=/private/tmp/ln076-shared-top \
node e2e/run-mobile.mjs
```

## Rework 14 single record-structure editor verification

On a populated Time date, inspect `320/390/426/700/768/1280px`. `Adjust / 调整` must sit beside
`Record / 记录` with a `4–16px` related gap, aligned centers, a `44px+` target, visible keyboard focus,
and no horizontal overflow. The fixed-record progress header must contain no link.

Activate Adjust and confirm the URL is exactly `/settings#record-setup`. The page must show the
complete Domain → Category → Template tree, including both linear and periodic templates. Toggle one
periodic template's homepage visibility, return to the diary, and confirm the fixed row changes;
restore it through the same complete editor. `/templates` and `/templates?focus=periodic` must both
finish at `/settings#record-setup`, with no periodic-only hint or filtered page.

```bash
node --check e2e/run-mobile.mjs
node --test tests/project-structure.test.mjs
```

## Full gate

```bash
npm run check
```

Expected outcome: design validation, unit tests, mobile browser checks, production PWA offline and
installability checks, production build, and diff whitespace checks all pass.

## Evidence handoff

Record the focused and full-gate pass counts plus the revised screenshots and
`output/playwright/ln-076-book-page-ritual/ln-076-visual-evidence.json` in the LN-076 board row. Keep direct owner preference
and the 14-day observation pending until genuinely completed.
