# Research: Local Domain Insights

## Decision 1: Use a fixed local 30-calendar-day window

**Decision**: The first version uses today plus the preceding 29 local calendar dates.
**Rationale**: It is immediately understandable, bounded enough for a readable daily line, deterministic offline, and requires no new date-picker interaction.
**Alternatives considered**: Seven days is too volatile for sparse personal records; ninety days creates a dense mobile chart and weaker recent-state signal; a configurable range adds controls before real-use evidence exists.

## Decision 2: Keep analysis temporary and source-linked

**Decision**: Derive the review in memory on each visit and display bounded excerpts from the records that support it. Do not persist scores, summaries, advice, or rewritten notes.
**Rationale**: This preserves raw-note ownership, keeps backup compatibility, avoids stale derived state, and makes every observation traceable to the user's own record.
**Alternatives considered**: Persisted summaries would require schema, synchronization, conflict, migration, and backup decisions that belong to the later LN-010 experiment loop.

## Decision 3: Expose one contextual mobile action

**Decision**: Show the analysis action only beside the currently active domain mark. Keep the domain mark itself as the scroll control.
**Rationale**: This matches the annotated screenshot, limits rail crowding, and makes the destination's domain context explicit.
**Alternatives considered**: A repeated action for every domain duplicates controls; adding it to the upper rocker stack changes an already constrained mobile order; a floating button competes with quick recording.

## Decision 4: Draw the dynamic series with Canvas and expose text

**Decision**: Use the browser Canvas 2D API for the line and axis marks, paired with a visible/accessible textual summary and trend label.
**Rationale**: It represents real local data without adding a chart dependency. The text equivalent keeps the information available when Canvas is unavailable or invisible to assistive technology.
**Alternatives considered**: A raster asset cannot represent the live series; a new chart package adds bundle and maintenance cost; a custom inline SVG conflicts with the project's asset constraints.

## Decision 5: Treat investment output as record-quality review, not financial advice

**Decision**: For domains whose localized name contains a narrow investment keyword, report only whether recent notes appear to contain rationale, outcome, and risk-boundary evidence, then offer one fixed reflection prompt. Include an explicit non-advice boundary.
**Rationale**: FINRA describes online tools as informational/educational rather than investment advice and warns that automated outputs may omit important personal circumstances and be unsuitable. A local notebook cannot know a user's complete financial situation, holdings, objectives, or current market context.
**Sources**: [FINRA Tools & Calculators Disclaimer](https://www.finra.org/investors/tools-and-calculators/disclaimer), [FINRA Automated Investment Tools alert](https://www.finra.org/investors/insights/automated-investment-tools)
**Alternatives considered**: Return, risk, or trade recommendations would need verified transaction and market data plus separate product, architecture, and privacy approval; free-form AI advice would add an unapproved external trust boundary.

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
