# UI Contract: Local Domain Insights

## Home-page entry

### Mobile

- The existing domain mark remains the control that scrolls to that domain.
- A separate analysis link appears only below the currently active domain label; both visible elements form one vertical column in the right rail.
- The link has a minimum 44 × 44 px target, visible focus state, local transparent icon, and accessible name containing the domain name.
- At every supported mobile viewport, every domain target and visible label—whether or not it owns the analysis action—must share the same center axis as the upper rail controls. Domain targets remain 44 × 44 px; the current domain and analysis targets also share that axis and keep at least 4px vertical clearance. The active label stays to the right of the binding axis, each mark may extend left from its target only to remain spine-aligned, and the complete stack keeps at least 4px horizontal clearance from the Diary Agent target without relying on an opaque label background to mask a collision. It must also avoid the lower download control and content edge.
- Activating it navigates to `/insights?domain=<encoded domain id>`.

### Desktop

- A compact secondary Insights link is available in the header.
- It is hidden from the mobile upper-rail sequence so the current rocker order is unchanged.

## Insights route

- Route: `/insights`; optional query: `domain=<configured id>`.
- Invalid or absent domain selects the first domain with recent records, then the first configured domain.
- The existing management header supplies the return action and page title.
- The surface uses warm open paper, ruled separators, journal typography, and one restrained blue activity line. It must not become a grid of generic rounded cards.
- The product-owner-selected 390 × 844 composition orders the domain selector before the selected-domain summary and keeps the ordinary state legible in one viewport.

## Required information

- Fixed “last 30 days” window label.
- Left-aligned compact domain selector with selected state available beyond color; each label owns the
  only permanent visible domain record total.
- Straight 30-point daily line with a zero baseline, two weak horizontal guides, non-zero markers,
  start/middle/end date labels, and a complete semantic text alternative.
- No permanent large total/active-day row and no permanent ordinary/periodic split.
- One selected-day detail, shown only after chart interaction, containing the date, daily total,
  daily ordinary/periodic split, and 30-day active-day count.
- One concise evidence-state or trend label in words.
- No visible record index, source excerpt, generic reflection block, or repeated latest/previous-week prose.
- Explicit unresolved-record notice when applicable.

## Chart interaction

- The chart owns one focus target rather than 30 date controls.
- Pointer or touch selects the nearest calendar date; selecting the same date again closes the
  detail.
- Enter or Space opens the latest active date. Left/Right moves one calendar date, Home/End moves
  to the first/last date, and Escape closes the detail.
- The selected detail is real DOM text in a polite live region. Empty domains keep a zero line and
  neutral equivalent text but cannot open a fabricated detail.
- Domain changes clear the selected date before the replacement series is shown.

## Investment-like domain boundary

- Do not show permanent coverage counts, a recording prompt, source links, or excerpts.
- Always state that this is a review of records, not investment advice.
- Never show or generate buy, sell, hold, allocation, timing, price-target, projected return, or personalized risk-tolerance guidance.

## States

- `hydrating`: quiet progress copy; no stale account result.
- `recovery`: no analysis of potentially inconsistent payload; show recovery-safe guidance.
- `account transition`: discard any pending result from the prior account or payload revision and show hydration until the replacement derivation is complete.
- `no domains`: explain that a domain and categorized records are needed; retain return navigation.
- `empty domain`: render a zero rhythm and neutral short state, not a negative judgment.
- `insufficient`: show the available facts and a compact evidence label without describing direction.
- `ready`: show the factual direction in one short label tied to the visible rhythm.

## Responsive and accessibility acceptance

- Validate at widths 320, 390, 426, 768, and 1280 px.
- No horizontal page overflow; rail and chart labels remain readable.
- Domain buttons remain at least 44px, use approximately 16px mobile and no more than 24px desktop
  gaps, and contain any long-name horizontal scrolling within the selector.
- No required label, axis annotation, trend word, selected-day detail, investment boundary, or control text is clipped or overlaps at a supported width.
- All actions are keyboard reachable and at least 44 px.
- Focus indication is visible against paper texture.
- Direction and selected state never rely on color alone.
- Canvas has a complete semantic name and a visually hidden text equivalent; the interactive
  wrapper has one visible focus state and keyboard instructions.
- Reduced-motion preference removes nonessential transitions.

## Offline contract

- `/insights` and its icon are in the versioned application/document shell.
- A previously authenticated account can navigate to and directly reload the page offline using its isolated local payload.
- The page makes no market, AI, analytics, or other external request.

## Performance contract

- A deterministic 5,000-record fixture runs in headless Playwright Chromium with the existing E2E mobile profile: `390 × 844`, touch enabled, device scale factor `2`.
- Local record derivation plus first review render completes within 1,000ms.
