# UI Contract: Local Domain Insights

## Home-page entry

### Mobile

- The existing domain mark remains the control that scrolls to that domain.
- A separate analysis link appears only beside the currently active domain.
- The link has a minimum 44 × 44 px target, visible focus state, local transparent icon, and accessible name containing the domain name.
- At every supported mobile viewport, its target bounding box must stay inside its assigned rail slot with at least 4px clearance from the domain mark, binding axis, upper Search → Time/Category → Diary/Plan → Settings controls, lower download control, and content edge.
- Activating it navigates to `/insights?domain=<encoded domain id>`.

### Desktop

- A compact secondary Insights link is available in the header.
- It is hidden from the mobile upper-rail sequence so the current rocker order is unchanged.

## Insights route

- Route: `/insights`; optional query: `domain=<configured id>`.
- Invalid or absent domain selects the first domain with recent records, then the first configured domain.
- The existing management header supplies the return action and page title.
- The surface uses warm open paper, ruled separators, journal typography, and one restrained blue activity line. It must not become a grid of generic rounded cards.

## Required information

- Fixed “last 30 days” window label.
- Domain selector with selected state available beyond color.
- Daily line chart with equivalent textual description.
- Total records, active days, ordinary/periodic split.
- Evidence state and trend label in words.
- Bounded recent source excerpts with dates.
- One fixed reflection prompt when evidence permits.
- Explicit unresolved-record notice when applicable.

## Investment-like domain boundary

- Show counts for rationale, outcome, and risk-boundary note coverage.
- Show one prompt aimed at improving what the user records next.
- Always state that this is a review of records, not investment advice.
- Never show or generate buy, sell, hold, allocation, timing, price-target, projected return, or personalized risk-tolerance guidance.

## States

- `hydrating`: quiet progress copy; no stale account result.
- `recovery`: no analysis of potentially inconsistent payload; show recovery-safe guidance.
- `account transition`: discard any pending result from the prior account or payload revision and show hydration until the replacement derivation is complete.
- `no domains`: explain that a domain and categorized records are needed; retain return navigation.
- `empty domain`: render a zero series and neutral recording prompt, not a negative judgment.
- `insufficient`: show the available facts and explain that more active days are needed before describing direction.
- `ready`: show direction, evidence, and one bounded prompt.

## Responsive and accessibility acceptance

- Validate at widths 320, 390, 426, 768, and 1280 px.
- No horizontal page overflow; rail and chart labels remain readable.
- No required label, axis annotation, trend word, source date, or control text is clipped or overlaps at a supported width.
- All actions are keyboard reachable and at least 44 px.
- Focus indication is visible against paper texture.
- Direction and selected state never rely on color alone.
- Canvas has a semantic text alternative and a visible three-point summary.
- Reduced-motion preference removes nonessential transitions.

## Offline contract

- `/insights` and its icon are in the versioned application/document shell.
- A previously authenticated account can navigate to and directly reload the page offline using its isolated local payload.
- The page makes no market, AI, analytics, or other external request.

## Performance contract

- A deterministic 5,000-record fixture runs in headless Playwright Chromium with the existing E2E mobile profile: `390 × 844`, touch enabled, device scale factor `2`.
- Local record derivation plus first review render completes within 1,000ms.
