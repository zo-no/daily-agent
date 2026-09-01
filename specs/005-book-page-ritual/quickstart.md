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
320, 390, 426, 768, and 1280px. Expected outcome: each domain exposes one compact chapter line
containing distinct domain/first-category headings and progress, long names wrap without overflow,
later categories retain separate subordinate headings, the last metric row and next domain do not
produce two consecutive rule assets, and periodic inputs remain at least 44px.

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
Expected outcome: every Diary date has one application-shell Agent layer; mobile 320/390/426/600/700
keeps it inside the safe viewport rail at top/middle/bottom scroll, desktop 768/1280 keeps one still
peek, and Plan/Search/Settings/composer hide it. Idle/scanning/reviewing expose slow 28/20/32-second
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
- `output/ln-076-category-chapters/ln-076-category-chapter-390.png`
- `output/ln-076-category-chapters/ln-076-category-chapter-comparison-390.png`

Review for one coherent journal material, note primacy, an owned first content gap, a believable but
quiet binding gutter, and a composer that feels continuous with the page. Reject ornamental noise,
generic dashboard cards, a bright unrelated action style, or any new recording decision.

For the Rework 3 Agent comparison, place the marked owner reference and the implementation's idle,
reviewing, and complete 390px states in one normalized comparison image. Record findings and
iterations in project-root `design-qa.md`. The final report must say `final result: passed` before
handoff.

For Rework 4, place the marked owner screenshot and the same seeded 390px implementation in one
normalized comparison image. Judge heading hierarchy, section rhythm, typography, color, source
assets, copy, row alignment, and whether only one rule explains the Health-to-Learning transition.

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
