# Research: Local Domain Insights

## Decision 1: Use a fixed local 30-calendar-day window

**Decision**: The first version uses today plus the preceding 29 local calendar dates.
**Rationale**: It is immediately understandable, bounded enough for a readable daily line, deterministic offline, and requires no new date-picker interaction.
**Alternatives considered**: Seven days is too volatile for sparse personal records; ninety days creates a dense mobile chart and weaker recent-state signal; a configurable range adds controls before real-use evidence exists.

## Decision 2: Keep analysis temporary and metric-linked

**Decision**: Derive the review in memory on each visit, keep any bounded source references and investment coverage internal to deterministic regression, and display only reconcilable selector totals, the daily rhythm, on-demand subtype detail, and the fixed investment boundary. Do not show a record index or excerpts, and do not persist scores, summaries, advice, or rewritten notes.
**Rationale**: This preserves raw-note ownership and backup compatibility while honoring the product owner's request for a one-glance page. Visible observations remain tied to displayed metrics without exposing a second browsing surface.
**Alternatives considered**: Persisted summaries would require schema, synchronization, conflict, migration, and backup decisions that belong to the later LN-010 experiment loop.

## Decision 3: Expose one contextual mobile action

**Decision**: Show the analysis action only below the currently active domain label, with both visible elements sharing one column in the right rail. Keep the domain mark itself aligned to the spine and keep the domain control as the scroll control.
**Rationale**: This follows the product owner's visual correction, keeps the label out of the left reading surface, limits rail crowding, and makes the destination's domain context explicit.
**Alternatives considered**: A repeated action for every domain duplicates controls; adding it to the upper rocker stack changes an already constrained mobile order; a floating button competes with quick recording.

## Decision 4: Draw a compact interactive line with Canvas and expose text

**Decision**: Use the browser Canvas 2D API for one straight 30-day line with a zero baseline, two
weak horizontal guides, non-zero markers, meaningful visible date labels, a complete accessible
name, and one focusable interaction surface that reveals real DOM detail on demand.
**Rationale**: A straight line makes sparse changes legible without a chart dependency or visual
overstatement. Deferring daily totals and the ordinary/periodic split until selection removes the
duplicate permanent metric bands while preserving full pointer, touch, keyboard, and screen-reader
access to the facts.
**Alternatives considered**: A raster asset cannot represent the live series; a new chart package adds bundle and maintenance cost; a custom inline SVG conflicts with the project's asset constraints.

## Decision 5: Keep only a fixed investment boundary in the compact local view

**Decision**: For domains whose localized name contains a narrow investment keyword, show the explicit non-advice boundary but no visible coverage block or reflection prompt. Internal bounded coverage may remain as a regression aid but is not part of the product surface. This supersedes the earlier coverage-and-prompt presentation after the owner chose the compact line-first composition.
**Rationale**: FINRA describes online tools as informational/educational rather than investment advice and warns that automated outputs may omit important personal circumstances and be unsuitable. A local notebook cannot know a user's complete financial situation, holdings, objectives, or current market context; a fixed boundary is the least misleading permanent treatment.
**Sources**: [FINRA Tools & Calculators Disclaimer](https://www.finra.org/investors/tools-and-calculators/disclaimer), [FINRA Automated Investment Tools alert](https://www.finra.org/investors/insights/automated-investment-tools)
**Alternatives considered**: Visible recording coverage and a deterministic prompt added text after the chart and were removed by the owner. Return, risk, or trade recommendations would need verified transaction and market data plus separate product, architecture, and privacy approval.

## Decision 6: Count each record once and expose provenance gaps

**Decision**: Map each qualifying record through `categoryId → domainId`; records with missing or invalid relationships go to an explicit unresolved bucket. Show ordinary records and records backed by a resolved `recordType: periodic` template separately without double counting.
**Rationale**: The result remains reconcilable with the source payload and does not silently discard legacy or malformed records.
**Alternatives considered**: Inferring a domain from note text is unpredictable and privacy-expanding; dropping unresolved records would make totals misleading.

## Decision 7: Use a bounded linear derivation

**Decision**: Prebuild 30 date buckets and lookup maps, then scan qualifying records once. Bound each domain's displayed evidence list.
**Rationale**: Complexity is approximately O(domains + categories + templates + records + 30 × domains), predictable for 5,000 records, and easy to test.
**Alternatives considered**: Repeated per-domain filtering is simpler to type but scales as domains × records and encourages rendering-time recomputation.

## Decision 8: Make `/insights` part of the offline document shell

**Decision**: Add the route and local icon to the service worker's versioned shell and verify a direct offline reload.
**Rationale**: A previously authenticated device must retain browse and review capability offline.
**Alternatives considered**: Depending on a prior client-side visit makes offline behavior accidental and fails the product invariant.
