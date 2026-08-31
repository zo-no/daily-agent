# Feature Specification: Confirmed Seven-Day Domain Summary

**Board Item**: `LN-074 Rework 16`
**Feature Directory**: `008-domain-weekly-summary`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "在领域复盘折线图后加入 AI 分析，把当前领域最近一周的普通与周期记录抓到一起；先展示数据授权并二次确认，只生成一次简短周总结，不做聊天、记录索引或持久化。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## Clarifications

### Session 2026-08-31

- The first action opens disclosure only and MUST create zero analysis requests. A request begins
  only after a separate “Start summary” confirmation.
- “Generate once” means one request for each confirmed disclosure state. Re-analysis is allowed only
  by reopening and confirming the same disclosure again.
- The seven-day window is the current local calendar day plus the preceding six natural days. Both
  ordinary and periodic records are included; unassigned and other-domain records are excluded.
- A limited sample may still be summarized with a fixed “Limited sample” marker. A zero-record
  domain cannot send a request.
- The result is a short overview and at most three themes. Source identifiers are validation-only
  and MUST NOT become a visible record index, link list, or excerpt surface.
- There is no local AI imitation. Offline, unconfigured, timed-out, invalid, aborted, or unsafe
  output produces a short unavailable state while the local line remains usable.
- Switching domain or account, leaving the page, or pressing Stop aborts the active request and
  removes the disclosure and any prior result.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review the Exact Weekly Data Boundary (Priority: P1)

An author can ask for a weekly summary from the existing domain review page, inspect exactly which
domain, dates, record types, record count, truncation, and remote-processing boundary apply, and
cancel without sending anything.

**Why this priority**: The feature sends private note text outside the browser. A clear, request-free
disclosure is the smallest safe and independently useful step.

**Independent Test**: With recent records in the selected domain, activate the secondary action and
verify the disclosure facts while observing zero API requests and zero data writes; cancel returns
to the unchanged local chart.

**Acceptance Scenarios**:

1. **Given** a current domain with qualifying ordinary and periodic records, **When** the author
   activates “AI summary for the last 7 days,” **Then** the page shows the domain, inclusive start
   and end dates, both subtype totals, remote text boundary, session-only result boundary, and any
   80-record truncation before sending a request.
2. **Given** the disclosure is open, **When** the author cancels, switches domain/account, or leaves
   the page, **Then** the disclosure closes, no request is sent, no source data changes, and no stale
   disclosure follows the new context.
3. **Given** the current seven-day domain window has no records, **When** the author reaches the AI
   action, **Then** the action explains that no summary is available and cannot initiate a request.

---

### User Story 2 - Receive One Bounded Weekly Summary (Priority: P1)

After confirmation, an author receives one compact synthesis grounded only in the selected domain's
latest seven local days, without chat, advice, source index, persistence, or changes to raw notes.

**Why this priority**: This is the requested value after the privacy gate: one concise overview that
helps browse recent themes without becoming a general assistant.

**Independent Test**: Confirm a synthetic current-domain request and return a valid bounded result;
verify exactly one request, one short overview, at most three one-sentence themes, no source links or
chat, a limited-sample marker when applicable, and byte-identical source storage.

**Acceptance Scenarios**:

1. **Given** a valid disclosure with qualifying records, **When** the author selects “Start
   summary,” **Then** exactly one bounded request is sent and the successful result shows an overview
   of at most three sentences plus no more than three title-and-one-sentence themes.
2. **Given** one or two records, or records from only one active day, **When** the author confirms,
   **Then** the request remains allowed and the result area visibly carries the fixed “Limited
   sample” marker.
3. **Given** a successful result, **When** the author selects re-analysis, **Then** a new disclosure
   is required before any second request.

---

### User Story 3 - Fail Safely Without Weakening the Local Review (Priority: P1)

An author can stop a slow request or encounter offline, configuration, timeout, malformed, forged,
or unsafe output while the factual local chart remains intact and no response is misrepresented.

**Why this priority**: A private-note analysis feature is acceptable only when failure is explicit,
bounded, and cannot leak old results or produce investment advice.

**Independent Test**: Exercise abort, offline, no-provider, timeout, invalid JSON/schema/IDs, stale
completion, and investment-advice output; each returns a short safe status, no persisted result, no
raw-note mutation, and a still-operable local chart.

**Acceptance Scenarios**:

1. **Given** a pending request, **When** the author presses Stop or changes domain/account/page,
   **Then** the request is aborted and its later completion cannot render.
2. **Given** offline, no configured provider, timeout, rate limit, authentication failure, invalid
   response, or forged source identifier, **When** summary generation fails, **Then** the page shows
   a concise unavailable state and never labels local fallback text as AI output.
3. **Given** an investment-like domain, **When** output contains a buy/sell/security/price/position/
   allocation/return/market-prediction statement or equivalent Chinese wording, **Then** the entire
   result is rejected, a safety failure appears, and the fixed non-advice boundary remains visible.

### Edge Cases

- The seven-day window crosses a month or year boundary, including leap day.
- More than 80 qualifying records exist; the newest 80 are selected deterministically and disclosure
  states that truncation occurred.
- A record exceeds 4000 characters; only its first 4000 Unicode characters are transmitted. An
  otherwise qualifying record with empty text remains in the subtype/count boundary with
  `content: ""`; the model is forbidden to invent a theme from it.
- Duplicate entry IDs, invalid dates/times, unassigned records, deleted categories, and records from
  another domain/account cannot enter the request.
- The model repeats themes, emits more than three, returns overlong text, or cites unknown IDs.
- A response arrives after Stop, re-analysis, domain/account change, or component unmount.
- Touch, keyboard, 320/390/426/768/1280px, long Chinese/English domain names, reduced motion, and
  horizontal overflow remain covered.

## Product Admission *(mandatory)*

### Core-Loop Contribution

Improves browse by producing one optional synthesis of the current domain's latest week after the
author has already reached the factual local review. It does not add a recording decision or change
record, search, edit/delete, export, restore, or offline CRUD behavior.

### User Evidence

The product owner explicitly asked to gather the latest week of the current domain for AI analysis,
rejected chat and repeated metric text, and chose a second-confirmation, session-only summary.

### Default Interface and Recording Cost

One secondary text action appears below the chart. It does not auto-run, open a modal on page load,
add a field, or increase quick-record actions. The first activation is disclosure only; successful
output is intentionally shorter than the surrounding local review and contains no chat box.

### Offline, Account, Privacy, Reversibility, and Backup

Selection begins from the active account's local payload and filters to the current domain plus the
latest seven local dates. The only transmitted fields are `windowStart`, `windowEnd`, `domainName`,
`locale`, and bounded `entries[{id,date,time,content,sourceType}]`. Account ID, identity, tags,
attachments, images, field values, template ID, category/domain tree, plans, other domains, and the
complete document are forbidden. The access token authenticates transport but is not part of the
model payload. The result lives only in current page memory, cannot edit notes, and never enters
local storage, IndexedDB, Supabase, Service Worker cache, JSON/Markdown export, or portable backup.
Offline use retains the local chart but reports remote summary unavailable.

### Verification and Removability

Pure selectors, route/provider contracts, response safety, browser flows, PWA offline direct-load,
responsive design, and full quality gates are automated with synthetic data. Real-model Chinese
quality and privacy trust remain manual. The selector, UI, provider, and independent route can be
removed without migration or data cleanup.

### Exit Condition

Keep isolated or remove when no actual reuse occurs within 14 days, ordinary responses frequently
exceed 8 seconds, summaries are not trusted, privacy concerns arise, or maintenance/cost outweighs
the browse benefit.

### Admission Decision

- **Score**: `15/20` using the rubric in `product.md`
- **Decision**: `isolated experiment`
- **Red-line check**: No silent note rewrite, required recording step, cross-account reuse, backup
  change, or authenticated-offline core regression is permitted. Remote text transfer requires the
  explicit per-request disclosure and confirmation defined here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST place one secondary weekly-AI text action after the current-domain
  chart and MUST NOT initiate analysis automatically.
- **FR-002**: The first activation MUST show a disclosure containing domain, inclusive seven-day
  dates, ordinary/periodic totals, transmitted-text boundary, current AI service boundary,
  session-only/non-writing result boundary, and deterministic truncation notice when applicable.
- **FR-003**: No analysis request may occur until a separate “Start summary” confirmation; cancel,
  zero-record, domain/account change, and page exit MUST not send a request.
- **FR-004**: The input selector MUST use the current local date and preceding six natural days,
  current account, current configured domain, and both ordinary and periodic records; it MUST
  exclude unassigned/deleted-category and every other domain/account record.
- **FR-005**: The request MUST contain only `windowStart`, `windowEnd`, `domainName`, `locale`, and
  `entries[{id,date,time,content,sourceType}]`, with at most the deterministically newest 80 entries
  and at most 4000 Unicode characters per content. Empty content remains an explicit empty string;
  no extra request field is allowed.
- **FR-006**: `POST /api/organize/domain-review` MUST be independent of single-day Agent endpoints
  and retain same-origin checks, Bearer authentication, authenticated-account rate limiting,
  256 KiB body limit, private/no-store response policy, and a 20-second server timeout.
- **FR-007**: The client MUST enforce a 25-second timeout and support Abort. Stop, domain/account
  change, page exit, and superseding confirmation MUST cancel work and invalidate late completion.
- **FR-008**: A valid response MUST contain only a bounded `overview` of at most three sentences, at most three
  unique themes with title/one-sentence summary/internal valid entry IDs, plus server-controlled
  `providerId` and `generatedAt`. Internal IDs MUST NOT appear as a visible index or excerpt list.
- **FR-009**: Zero records MUST never request. Limited evidence MAY request but MUST show a fixed
  “Limited sample” marker independently of model output.
- **FR-010**: Offline, unavailable configuration, authentication/rate/timeout/upstream failure,
  invalid schema, overlong output, duplicate themes, or forged IDs MUST produce a concise
  unavailable state and MUST NOT be replaced by a fabricated local AI summary.
- **FR-011**: Model instructions and response validation MUST permit only facts and themes explicit
  in the request notes and MUST prohibit diagnosis, causal claims, behavior scoring, or advice.
- **FR-012**: For investment-like domains, the fixed non-advice boundary MUST remain visible; if any
  output contains a buy/sell/hold/security/price/position/allocation/return/profit/loss/forecast or
  market-prediction statement or equivalent Chinese wording, the whole result MUST be rejected.
- **FR-013**: Successful output MUST show only overview, up to three themes, a limited-sample marker
  when applicable, and a re-analysis action that returns to disclosure. It MUST NOT show chat,
  follow-up, source links, record index, excerpts, automatic advice, or persistence controls.
- **FR-014**: Disclosure, loading, result, and failure states MUST exist only in the current page
  session and MUST clear on domain/account change or page exit without changing source records.
- **FR-015**: All controls MUST be keyboard reachable with visible focus and at least 44×44px. At
  320/390/426/768/1280px, disclosure and result text MUST wrap without horizontal page overflow;
  reduced motion MUST remove nonessential transitions.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: The `LN-010 Phase 1` local chart remains fully usable without this remote capability.

### Key Entities

- **WeeklyDomainInput**: Session-derived seven-day current-domain whitelist plus selection/truncation
  facts; never persisted.
- **DomainReviewEntry**: One transmitted record with only ID, local date/time, bounded text, and
  `ordinary` or `periodic` source type.
- **DomainWeeklySummary**: Validated session-only overview/themes with server metadata and internal
  source IDs used only for grounding validation.
- **SummarySession**: Browser state `idle → disclosure → loading → result|unavailable`, scoped to the
  current account/domain and invalidated by context change or abort.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Automated browser evidence proves first activation creates zero requests and one
  confirmed activation creates exactly one bounded request.
- **SC-002**: Unit/route tests prove every request field is allowlisted, cross-domain/account and
  sensitive fields are absent, 7-day boundaries and 80×4000 limits hold, and forged/unsafe output
  cannot render.
- **SC-003**: Stop, timeout, offline, domain/account change, page exit, and late response tests show
  no stale summary, no write, and an intact local line.
- **SC-004**: At all supported widths, action/disclosure/result controls remain ≥44px, focus-visible,
  readable, and page `scrollWidth` equals viewport width.
- **SC-005**: Focused tests, PWA direct offline route, `npm run design:check`, `npm run check`, and
  `git diff --check` pass with synthetic data before return.
- **SC-006**: Real-model Chinese quality, privacy trust, median-feeling latency under 8 seconds, and
  at least one repeat use within 14 days remain explicitly pending manual evidence. Latency is the
  median wall-clock time from Start summary to visible success across at least three successful
  confirmed requests in that window; cancelled and failed requests are reported separately.

## Scope Boundaries *(mandatory)*

### In Scope

- One confirmed seven-day current-domain summary, bounded API route/provider/selector, session state,
  compact disclosure/result UI, cancellation, safety validation, localization, and tests.

### Out of Scope

- Chat, follow-up questions, persistent summaries, vector/search index, database/sync/backup fields,
  attachment/image analysis, cross-domain comparison, behavior coaching, medical diagnosis,
  investment advice, market data, notifications, background generation, or `LN-010 Phase 2`.

## Assumptions and Dependencies

- The existing authenticated same-origin AI boundary and configured provider may be reused without
  sending its secret to the browser.
- Authentication authorizes use of the route but does not cause the server to read the account
  document. Current-account/current-domain ownership is enforced by the isolated browser payload
  and pure selector; the server treats every submitted note and ID as untrusted request data, never
  resolves it against another account, never stores it, and returns no source text.
- `LN-010 Phase 1` supplies the current domain page but remains independently local-only.
- Real provider configuration may be absent in automated environments; deterministic route stubs
  and synthetic records are used for automation.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-005, US1 | Selector unit tests and browser request interception | LN-074 Rework 16 disclosure/privacy |
| FR-006–FR-012, US2–US3 | Route/provider/model safety tests | LN-069 bounded AI boundary + Rework 16 safety |
| FR-013–FR-015 | Focused browser responsive/focus/cancellation screenshots and DOM assertions | Rework 16 secondary UI contract |
| NR-001–NR-005, SC-003–SC-005 | Payload equality, offline/PWA, design/full gates | Core-loop and removability guardrails |
| SC-006 | Manual real-model and 14-day observation | Pending product acceptance only |
