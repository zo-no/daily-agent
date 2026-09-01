# Feature Specification: Hero-Triggered Composer Content Improvement

**Board Item**: `LN-078`
**Feature Directory**: `013-composer-content-improvement`
**Created**: 2026-09-01
**Status**: Implementation authorized
**Input**: User description: "Agent（Hero 图）也会进来看着，这样我们点击 Hero 图来交互；小对话有点重了，页面就这么大。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Improve One Free-Text Draft by Tapping Hero (Priority: P1)

An authenticated author writing an ordinary free-text record sees the familiar Hero inside the
paper editor. Tapping it once asks for one improved version without leaving the editor or opening a
conversation.

**Why this priority**: It is the complete user-requested interaction and the smallest useful slice:
the Hero is both presence and control, while the writing area remains primary.

**Independent Test**: Open an ordinary draft containing text, tap the Hero, and verify exactly one
request, a visible working state, and a bounded candidate shown in the existing writing area.

**Acceptance Scenarios**:

1. **Given** a non-empty ordinary free-text draft, **When** the author taps Hero, **Then** exactly one
   authenticated same-origin request is made for that source version and Hero visibly enters a
   working state without opening chat, a modal, or another page.
2. **Given** an empty, whitespace-only, or over-4000-character draft, **When** the author taps Hero,
   **Then** no request is made, focus returns to the writing area, and a compact accessible prompt
   asks the author to write something first or shorten the draft without silently truncating it.
3. **Given** a structured or periodic draft, **When** its editor opens, **Then** no content-improvement
   Hero is rendered and the existing editor is unchanged.

---

### User Story 2 - Compare, Use, or Cancel Without Automatic Saving (Priority: P1)

After an improvement arrives, the author reviews it where the original text was written, can switch
between original and candidate, and either uses the candidate or cancels. Using it updates only the
current draft; the existing `Done` action remains the only save action.

**Why this priority**: A generated rewrite is unsafe unless the original remains available and every
persistent change is a separate explicit decision.

**Independent Test**: Produce a candidate, toggle original/candidate, cancel once, then retry and use
the candidate; verify persisted data stays unchanged until `Done` and then contains exactly the
chosen draft.

**Acceptance Scenarios**:

1. **Given** a valid candidate, **When** it is displayed, **Then** the existing writing area shows the
   candidate by default and one compact row provides original/candidate viewing, `Use improved
   draft`, and `Cancel`, each with a real target of at least 44px.
2. **Given** a candidate, **When** the author cancels, **Then** the exact original draft returns and no
   account data, local cache, cloud document, export, or backup changes.
3. **Given** a candidate, **When** the author selects `Use improved draft`, **Then** only the in-memory
   draft content changes, review state closes, and the existing `Done` action is still required to
   save through the normal local-first path.

---

### User Story 3 - Reject Stale or Unsafe Results (Priority: P1)

An author can keep writing, close the composer, switch records, or encounter a remote failure
without an old or malformed candidate changing the draft.

**Why this priority**: Network latency and untrusted model output must not overwrite newer text or
weaken the offline core loop.

**Independent Test**: Hold a request, change or close the draft, then resolve it; repeat with invalid
output, timeout, offline, and rate limit. Every case must end with zero draft or persisted write from
the result.

**Acceptance Scenarios**:

1. **Given** an improvement request is pending, **When** content, target, account generation, or the
   composer lifecycle changes before it returns, **Then** the request is aborted or ignored and the
   late response is not rendered or applied.
2. **Given** the route is offline, unavailable, timed out, rate-limited, unauthenticated, cross-origin,
   oversized, or returns unknown/invalid fields, **When** the request finishes, **Then** a compact
   recoverable error is announced and all draft and persisted data remain unchanged.
3. **Given** a later request supersedes an earlier request, **When** responses arrive out of order,
   **Then** only the latest matching request ID, target, schema version, and source fingerprint may
   become the current candidate.

### Edge Cases

- Source text has leading/trailing whitespace, Markdown, emoji, Chinese, or line breaks; the exact
  admitted source is sent without trim/truncation and output stays within the declared bound.
- The model returns the exact source text; the UI treats it as a valid no-op candidate but disables
  meaningless application and explains that the text is already suitable.
- The user taps repeatedly during generation; the active request is not duplicated.
- A candidate exists while `More`, attachment actions, formatting selection, or keyboard shortcuts
  are used; ambiguous mutation is prevented by ending proposal review before those actions proceed.
- Browser focus, screen-reader announcement, touch, keyboard activation, and reduced-motion behavior
  remain usable at 320, 390, 426, and 1280px.
- The app is offline or remote AI is unconfigured; manual writing and `Done` remain fully usable.

## Product Admission *(mandatory)*

### Core-Loop Contribution

Improves `edit` by offering one optional refinement of the current ordinary draft in place. It does
not alter opening, writing, saving, browsing, searching, deleting, backup/restore, or offline CRUD.

### User Evidence

The product owner marked the real mobile editor, requested content optimization, selected the
existing Agent Hero itself as the interaction, and rejected a separate button and small conversation
as too heavy for the available sheet.

### Default Interface and Recording Cost

One composer-local Hero is visible only for ordinary free-text drafts. It uses no separate toolbar
button, chat, prompt field, history, page, modal, card, or required choice. Quick recording remains
one action to open and one `Done` action after typing; using optimization is optional.

### Offline, Account, Privacy, Reversibility, and Backup

The request contains only `schemaVersion`, `requestId`, a random composer-session `target`,
`sourceFingerprint`, `locale`, and bounded current `content`. Authentication travels in the existing
Bearer header; the JSON body omits user ID/email, persistent record ID, category, tags, template,
attachments, images, other records, plans, and the complete document. Over-limit text is not sent or
truncated. The provider secret stays server-side. Candidate and status are composer-session state.
Only explicit use changes the draft and only existing `Done` persists it. Cancellation, staleness,
failure, and offline conditions are zero-write. No schema, migration, export, or backup change exists.

### Verification and Removability

Pure model and route tests protect strict schemas, bounds, prompt-injection treatment, auth/origin,
rate/body/time limits, safe errors, request/fingerprint echo, and one model call. Browser regression
protects Hero-only activation, zero-request empty text, same-area review, cancel/use/save separation,
stale invalidation, errors, focus, target size, and four widths. Removing the Hero, provider, route,
model, capability registration, styles, and copy requires no data migration.

### Exit Condition

Keep isolated or remove after 14 days if used fewer than twice, usually cancelled or mostly rewritten,
repeatedly slower than eight seconds, visually distracting, mistaken for automatic saving, or harmful
to privacy, offline use, accessibility, performance, backups, or the quality gate.

### Admission Decision

- **Score**: `16/20`
- **Decision**: `mainline candidate` limited to one-shot ordinary-draft improvement
- **Red-line check**: no silent raw rewrite, required recording step, background request, persisted AI
  entity, unapproved data field, offline-core dependency, schema change, or backup change

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only the ordinary free-text composer MUST render the composer-local Hero.
- **FR-002**: The Hero MUST be a semantic button with localized accessible name and a real target of
  at least 44px; the application-shell Diary traveler MUST remain hidden while composing.
- **FR-003**: Empty, whitespace-only, or over-4000-character content MUST cause zero network requests,
  MUST NOT be silently trimmed or truncated, and MUST return focus to the writing field with an
  accessible compact message.
- **FR-004**: One Hero activation MUST create at most one active request; repeat activation while
  pending MUST NOT duplicate it.
- **FR-005**: The browser request body MUST contain only the six admitted fields and MUST bind a
  versioned schema, unique request ID, current draft target, locale, content, and source fingerprint.
- **FR-006**: The route MUST require JSON, same-origin, a valid account Bearer token, per-account rate
  limiting, a 256 KiB body limit, bounded content, server-only Provider configuration, a 20-second
  timeout, bounded response transport, strict structured output, and private no-store responses.
- **FR-007**: Records inside the prompt MUST be treated as untrusted data, not instructions. The
  model contract MUST instruct preservation of meaning/facts and prohibit invented facts, diagnoses,
  advice, headings, or commentary. The strict output MUST contain only one bounded
  `improvedContent` field; because semantic fidelity cannot be proven by schema alone, the candidate
  MUST remain visibly reviewable and inert until explicit use.
- **FR-008**: The response MUST echo the validated schema version, request ID, target, and source
  fingerprint plus the candidate; unknown fields or mismatches MUST reject the whole response.
- **FR-009**: A valid candidate MUST be previewed in the existing writing area, with one compact row
  for original/candidate viewing, explicit use, and cancel; no chat or parallel content panel is allowed.
- **FR-010**: Candidate preview MUST be read-only. `Use improved draft` MUST be the only action that
  updates `draft.content`; it MUST NOT call `commitData` or save automatically.
- **FR-011**: Existing `Done` MUST remain the only persistence action and MUST be unavailable while a
  request or candidate decision makes the visible content ambiguous.
- **FR-012**: Editing source content, changing target/account generation, closing, selecting another
  template, starting a newer request, or leaving the surface MUST abort or invalidate the proposal.
- **FR-013**: Offline, unconfigured, auth, origin, timeout, rate-limit, oversized, invalid-output,
  stale, and aborted cases MUST be visible, recoverable, and zero-write.
- **FR-014**: Hero states MUST reuse local `idle`, `scanning`, `complete`, and deterministic error/idle
  presentation without decorative loops; reduced motion MUST show immediate stable states.
- **FR-015**: Existing formatting, `More`, attachments, delete, keyboard save, close/discard, and
  ordinary manual editing MUST remain available outside an active proposal decision.
- **FR-016**: The server execution MUST register `content-improvement` as one additional fixed Mastra
  capability, use at most one model call, zero automatic retries, and no tools, Agent memory, durable
  storage, independent runtime, or workflow snapshots.

### Invariants and Non-Regression Requirements

- **NR-001**: Saved raw note content MUST remain unchanged unless the author explicitly chooses the
  candidate and separately saves it with `Done`.
- **NR-002**: Previously authenticated offline writing, account isolation, and stale-revision safety
  MUST not regress.
- **NR-003**: JSON/portable backup, restore, Markdown export, old data, attachments, and Service Worker
  behavior MUST remain compatible with no new member or cache entry.
- **NR-004**: Structured records, periodic records, Diary review, Plan review, organization, domain
  review, Google Calendar context, and quick-record steps MUST remain unchanged.
- **NR-005**: The existing quality gate and design validation MUST remain green.

### Key Entities

- **Improvement request**: One transient, versioned request bound to one target and one source
  fingerprint. It contains no persistent identity and expires with the composer session.
- **Improvement proposal**: One untrusted `improvedContent` candidate plus echoed binding fields. It
  is never stored and cannot write by itself.
- **Draft target**: A random opaque session-local key created for the current composer lifecycle; it
  contains no persistent entry ID or account identity and prevents a response crossing drafts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An author can request, compare, use, and then save an improved ordinary draft without
  leaving the composer, opening chat, or adding a required recording step.
- **SC-002**: Automated tests prove zero writes before explicit use plus `Done`, zero requests for
  empty text, one request per activation, and rejection of 100% of tested stale/invalid responses.
- **SC-003**: 320/390/426/1280px evidence shows no overlap or horizontal overflow, an expansive
  writing surface, and all Hero/review targets at least 44px with keyboard and screen-reader names.
- **SC-004**: Focused tests, `npm run design:check`, `npm run check`, and `git diff --check` pass before
  Return; real provider language/latency and 14-day adoption remain explicit manual evidence.

## Scope Boundaries *(mandatory)*

### In Scope

- Ordinary free-text composer Hero, one-shot improvement request, strict route/provider/model,
  same-area proposal review, explicit draft use, Mastra capability registration, copy, styles, tests,
  product/architecture/design/spec truth, and board evidence.

### Out of Scope

- Structured/periodic rewriting, Diary/Plan chat changes, template generation, multi-record context,
  style memory, personalization, background optimization, automatic application/save, persistent AI
  history, new schema/storage, migrations, Service Worker changes, provider/model switch, deployment,
  commit, push, and unrelated cleanup.

## Assumptions and Dependencies

- `LN-069` authenticated bounded route, `LN-076 Rework 8` Hero appearance, the current architecture's
  runtime AI safety protocol, and local `012-mastra-ai-consolidation` are the reused foundations.
- The Mastra-enabled path requires Node.js `>=22.13.0`; unsupported internal Node 20 deployment remains
  blocked and is not changed by this feature.
- A server-held configured compatible Provider exists only in environments where the optional action
  should work; manual writing remains the fallback everywhere.
- The current dirty tree contains user-owned work, including the local Mastra consolidation, that
  must be preserved and not folded into an unauthorized commit.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-004, US1 | composer unit/browser tests and 320/390/426/1280 screenshots | Hero-only one-tap entry |
| FR-005–FR-008, FR-016 | model/route/provider/runtime contract tests | bounded authenticated AI contract |
| FR-009–FR-015, US2/US3 | cancel/use/save, stale/error, keyboard and responsive E2E | explicit draft use and zero-write failure |
| NR-001–NR-005 | focused legacy suites, PWA/full gate, diff review | non-regression and removability |
| SC-004 | exact command evidence plus open real-model/14-day checks | Returned versus Accepted boundary |
