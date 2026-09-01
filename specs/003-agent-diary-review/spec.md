# Feature Specification: In-page Agent Diary Review

**Board Item**: `LN-074`
**Feature Directory**: `003-agent-diary-review`
**Created**: 2026-08-22
**Status**: Rework
**Input**: User description: "让 Agent 在当天日记页中被唤醒，逐条审查记录，停在问题行进行追问、闲聊或分类，并由用户确认后修改。" Follow-up evidence includes marked 390px screenshots and the 2026-08-31 request to strengthen both classification and follow-up questioning through a complete Agent analysis workflow. The latest keeps Search / Calendar / Settings / Export icons in the lane right of the binding line and requires a clear annotation hierarchy: question first, category result second, reply hint and actions quietest.

## User Scenarios & Testing

### User Story 1 - Wake and review today's diary (Priority: P1)

On a day with ordinary records, the user activates the existing diary helper illustration. The Agent wakes, announces that it is reviewing the selected day, then moves its visual anchor to the first record needing attention. Records without an issue remain readable and unchanged.

**Why this priority**: It creates the requested Agent-in-context experience and improves browse/review without adding a required recording step.

**Independent Test**: Seed a day with three records, activate the Agent, and verify the page enters a review state, highlights a specific row, and completes with every raw record unchanged when no action is confirmed.

**Acceptance Scenarios**:

1. **Given** the selected day has ordinary records, **When** the user activates the Agent illustration, **Then** an in-page review session starts without navigating away or opening a full-screen modal.
2. **Given** the session is scanning, **When** a review item is found, **Then** the Agent anchor and focus state move to the corresponding record row and the row remains the source of truth.
3. **Given** the day has no ordinary records or the user is in Plan mode, **When** the user views the page, **Then** the Agent entry is hidden.

### User Story 2 - Resolve a row conversation explicitly (Priority: P1)

When the Agent finds an unclear or incomplete note, it expands a compact conversation area directly below that row. The Agent may ask a bounded follow-up question, answer a casual message, or explain why it suggests a change. The user can dismiss or continue without leaving the diary.

**Why this priority**: The row-local conversation is the core interaction difference from the existing organizer and keeps context visible.

**Independent Test**: Mock a review item for one row, verify the conversation is attached to that row, submit a short answer, and verify the session advances or returns to idle without changing the raw note automatically.

**Acceptance Scenarios**:

1. **Given** a row has an open review item, **When** the Agent asks a follow-up, **Then** the question, response field, and explicit actions appear directly below that row and all controls are keyboard and touch accessible.
2. **Given** the user sends casual text, **When** the Agent responds, **Then** the response remains session-only and no record or category changes without a separate confirmation.
3. **Given** the user dismisses a question, **When** the user chooses keep original, **Then** the row closes and the original text remains byte-for-byte unchanged.

### User Story 3 - Confirm enrichment or existing-category filing (Priority: P1)

For a review item, the user can choose to append a confirmed detail to the original note, create the detail as a new note, keep the original, or apply one suggested existing category. The Agent never performs these changes silently.

**Why this priority**: It turns review into a useful recording improvement while protecting trust, reversibility, and existing structure.

**Independent Test**: For one mocked question and one category suggestion, exercise each explicit action and verify the resulting local state, undo behavior, and unchanged fields.

**Acceptance Scenarios**:

1. **Given** the Agent has a user-approved detail, **When** the user chooses append to original, **Then** only that record's content is updated through the normal local-first save path and the session marks the item resolved.
2. **Given** the Agent has a user-approved detail, **When** the user chooses new record, **Then** one new ordinary record is created for the selected day and the source record remains unchanged.
3. **Given** a category suggestion names an existing Domain / Category, **When** the user confirms it, **Then** only `categoryId` changes and an undo action is available.
4. **Given** the user is offline or the remote model is unavailable, **When** the user activates review, **Then** the session uses a deterministic local review/fallback or explains that no conversational action is available; it never blocks ordinary recording.

### User Story 4 - Scan a compact mobile diary composition (Priority: P1)

On a 390px diary page, the user can move from the title and review summary into the current record, its Agent annotation, the next content section, and the fixed action rail without crossing large unexplained blank regions. Utility and resolution actions look operable without becoming a card wall.

**Why this priority**: The product owner supplied direct visual evidence that the current composition wastes the first viewport, makes Agent actions look like plain text, lets the annotation consume too much horizontal space, and makes the right rail/export control feel unfinished.

**Independent Test**: Render the Chinese Agent category state at 390×844 and verify the title-to-record gap, annotation alignment, action control boundaries, rail label orientation, section continuity, and export control are all legible with no overlap or horizontal overflow.

**Acceptance Scenarios**:

1. **Given** the calendar is closed and an Agent summary is present, **When** the 390px page loads, **Then** the first record section begins within one major-region spacing step after the header context instead of after an empty visual band.
2. **Given** an Agent review is anchored to a record, **When** the user scans the annotation, **Then** its short source marker, prompt, category, and reply align to the record-content column and do not extend underneath the right rail.
3. **Given** one or more Agent resolutions are available, **When** the user views them on mobile, **Then** the actions are compact borderless text targets aligned to the annotation's right edge, retain 44px targets and a clear primary/secondary hierarchy, and do not form a second full-width control block.
4. **Given** the mobile utility and bottom action rail are visible, **When** the user scans the right edge, **Then** Search, Calendar, Settings, and Export use recognizable icon-only controls in the lane immediately right of the shared binding line, with accessible names, no visible text labels, and no accidental double-ring export treatment.
5. **Given** a review item is active, **When** the user scans from the source row into its annotation, **Then** no travelling child or dashed underline competes with the record; proximity and one quiet local accent preserve the relationship.
6. **Given** a category review is visible at 390px, **When** the user scans the annotation, **Then** the question is the strongest text, the category result is one step smaller, and the reply hint/action labels use the quietest type and color tier without shrinking the real input below 16px or any target below 44px.
7. **Given** a row annotation is visible at 390px, **When** the user follows it vertically, **Then** question, category, and reply text share the source reading axis; a single short marker sits immediately to their left; progress and close share the upper-right metadata row; category follows the question by about 6px; and actions terminate on the conversation right edge.

### User Story 5 - Clarify before filing an ambiguous record (Priority: P1)

When a note clearly belongs to one existing non-current category, the Agent can propose that category directly. When two or more existing categories are plausible, the Agent asks one question whose answer can distinguish them. After the answer, it either offers one existing category, offers a faithful detail to append, asks one final targeted question, or explains that the note should remain unchanged.

**Why this priority**: Classification and follow-up questions currently exist as separate terminal results. Connecting them creates a useful organizing loop without introducing autonomous writes, learned preferences, or a new data model.

**Independent Test**: Seed an ambiguous note that matches two existing categories, run analysis, answer the classification question, and verify that one allowlisted category becomes an explicit proposal while the record remains byte-for-byte unchanged until Apply category is selected.

**Acceptance Scenarios**:

1. **Given** one non-current existing category is strongly supported, **When** the Agent analyzes the day, **Then** it offers that category directly and does not ask a generic question first.
2. **Given** two or three existing categories are plausible, **When** the Agent analyzes the record, **Then** it asks one concrete discriminating question and carries only those existing category IDs as transient candidates.
3. **Given** the user's answer clearly resolves one candidate, **When** the reply is normalized, **Then** the resolved `Domain / Category` path appears once with Apply category and Keep original, and answering alone performs no write.
4. **Given** the answer supplies useful factual detail instead of resolving a category, **When** the reply is normalized, **Then** the Agent offers the existing append/new-record/keep choices and does not simultaneously offer a category write.
5. **Given** two user answers still do not support a safe category or detail proposal, **When** the final reply returns, **Then** the Agent stops asking, explains the uncertainty, and leaves Keep original available.

## Edge Cases

- Switching date, entering Plan mode, closing the page, or refreshing cancels the transient session and clears its conversation without changing records.
- A remote response with an unknown entry ID, unsupported category ID, missing action, duplicated item, or oversized text is discarded or reduced to a safe local fallback.
- A category suggestion that already matches the record's latest category is discarded before review. If the record changes to that category after the review starts, confirming the stale suggestion reports that it is already current and advances without writing.
- A stale revision or local save failure prevents the confirmed write and keeps the conversation open with a recoverable error.
- `prefers-reduced-motion` removes non-essential annotation transitions while preserving focus, source association, and status text.
- The experience remains usable at 320, 390, 426, 600, 671, 700, 768, and 1280px with no horizontal overflow and 44px minimum targets.
- A short record, one Agent annotation, and the following fixed-record section must not be separated by a layout-only spacer after the Agent moves away from its idle illustration slot.
- A classification reply naming an unknown, non-candidate, or already-current category is reduced to a no-change outcome and never becomes an actionable write.
- A model reply that simultaneously proposes a category and appended text is reduced to one safe outcome; the user is never asked to confirm two persistent mutations in one step.
- A clarification item stops accepting further replies after two user answers unless a safe append or category proposal has already been produced.

## Product Admission

### Core-Loop Contribution

Improves browse and edit by letting the user review and enrich the current day's notes in place, while keeping quick record unchanged.

### User Evidence

The product owner explicitly requested an Agent that wakes from the diary illustration, inspects today's lines, asks for missing detail, supports casual conversation, and replaces a separate classification page.
The product owner then identified classification and follow-up questioning as the two capabilities that need a more complete shared analysis process rather than parallel one-shot outputs.

### Default Interface and Recording Cost

The Agent remains a secondary illustration visible only when ordinary records exist. Activating it is optional and adds no step to quick recording. Confirmed append/new-record actions use the existing composer/save path; category filing is no longer required through a separate page but remains explicit in the row conversation.

### Offline, Account, Privacy, Reversibility, and Backup

The selected day's `id`, `time`, `content`, and current category ID plus bounded existing Domain / Category IDs and names may leave the browser only through the authenticated same-origin AI boundary. Tags, attachments, plans, email, user identity, category hints/history, other days, and the complete document are excluded. The session is transient and not backed up or synchronized. Local deterministic review works offline; conversational remote actions degrade safely. Raw content is never silently rewritten. Append, new-record, and category changes require explicit confirmation and category changes are undoable. Existing JSON, Markdown, and portable attachment backups remain unchanged.

### Verification and Removability

Model/provider tests cover bounded input, item normalization, explicit actions, fallback, cancellation, and safe writes. Mobile browser tests cover activation, row anchoring, conversation actions, category confirmation, Plan/empty/offline states, reduced motion, touch targets, and the eight responsive widths. Removing the Agent session provider and row UI restores the existing local organizer and does not require migration.

### Exit Condition

Keep isolated or remove if users do not activate it during a 14-day observation window, remote review exceeds 8 seconds or costs become material, suggestions are not trusted, or row-local interaction obscures quick recording.

### Admission Decision

- **Score**: 17/20
- **Decision**: mainline candidate as a bounded rework of LN-074
- **Red-line check**: no silent raw rewrite, no required recording step, no new persisted AI entity, no new account boundary, and no backup format change.

## Requirements

### Functional Requirements

- **FR-001**: The selected-day diary MUST expose one optional Agent activation control only when ordinary records exist and the user is not in Plan mode.
- **FR-002**: Activating the control MUST start a transient review session in the current page and MUST not navigate to a separate organizer for the primary flow.
- **FR-003**: The session MUST associate every review item with an allowlisted current-day record ID and visibly attach the annotation to that row without requiring a travelling character overlay.
- **FR-004**: The row-local conversation MUST support follow-up questions, session-only casual replies, and dismissal without changing records automatically.
- **FR-005**: The user MUST explicitly choose among append to original, create new record, keep original, or apply an existing category before any persistent change occurs.
- **FR-006**: Append/new-record writes MUST use the existing local-first account-owned save path and preserve all unrelated fields; category writes MUST change only `categoryId` and support undo.
- **FR-007**: Remote requests MUST be authenticated, bounded to the selected day's minimal record fields, schema-validated, rate-limited, timeout-bounded, and safely cancellable.
- **FR-008**: Offline, timeout, invalid-response, and no-key states MUST preserve ordinary record use and fall back to deterministic local review or an unavailable-conversation state.
- **FR-009**: Switching date, Plan mode, or closing the page MUST cancel the session and clear transient conversation state.
- **FR-010**: The interface MUST preserve existing row typography, open-paper layout, right rail geometry, keyboard order, 44px targets, localization, and reduced-motion behavior.
- **FR-011**: With the month grid closed, the mobile header-to-first-content gap MUST use the established 24–32px region rhythm and MUST NOT reserve calendar-sized space for an empty date context.
- **FR-012**: The mobile row annotation MUST align to the source record's actual `.entry-content` text edge rather than only its outer body container, stay inside the content clearance before the right rail, and end without a persistent empty helper slot before the next section.
- **FR-013**: Mobile Agent resolution actions MUST render as compact borderless text controls aligned to the annotation's right edge, with 44px minimum targets, one restrained accent-text primary state, and quieter secondary states; neither a shared segmented boundary nor separate full-width filled/outlined button blocks may compete with the record.
- **FR-014**: Mobile Search, Calendar, Settings, and Export MUST use recognizable icon-only controls in the lane immediately right of the shared binding line rather than centered over it, preserve accessible names and 44px targets, expose active/focus state without visible text labels, and avoid the double-ring export presentation.
- **FR-015**: Active Diary review MUST NOT render the travelling child illustration or a dashed/long blue underline beneath the source record. Source association MUST rely on immediate row adjacency, `aria-current`, and at most one short quiet accent that does not resemble keyboard focus.
- **FR-016**: The annotation accent MUST be a short corner/tick or similarly local mark rather than a tall three-sided bracket spanning the conversation and actions.
- **FR-017**: At mobile widths, the `16px` Sans source record MUST remain visually stronger than its Agent annotation. The annotation question MUST stay in the coherent Sans reading system at `13px` in muted supporting ink, preceded by a `10px` mono Agent role label and `11px` progress; the category result, action labels, and faint reply placeholder use `12px`. Placeholder styling MUST be independent from the actual textarea input size so the input remains at least `16px`; weakening visual text MUST NOT reduce action targets below `44px`.
- **FR-018**: Mobile Agent annotations MUST attach through one stable source relationship. Question, category result, and reply text share the actual record reading axis; one `2px × 24px` marker sits about `12px` to its left. Progress and close live at the upper right without overlap. Borderless actions end on the conversation right edge but do not need to begin on the reading axis.
- **FR-019**: Mobile Diary annotations MUST use proximity to express ownership: question-to-category spacing is about `6px`, category-to-reply remains within `2–8px`, reply-to-actions is at most `4px`, and actions-to-next-record uses a compact `8–14px` group gap. The reduced spacing MUST NOT change Plan Agent geometry.
- **FR-020**: At mobile Diary widths, interactive hit areas MUST be absorbed into the existing annotation rhythm instead of stacking as detached empty bands. One or two unresolved actions use one compact row immediately below the full-width reply, three resolved actions use one row at 390px, the active source row may compact to a 52px minimum, and the transition from ordinary records to fixed records uses about 12px rather than cumulative region margin and padding. All actions remain at least 44px and Plan Agent remains unchanged.
- **FR-021**: At `320–420px` during active Diary review, the page MUST use one compact reading grid: the summary-to-record-title gap is no greater than about `18px`; the source reading axis uses a `42px` time column plus about `10px` content inset; ordinary and fixed one-line rows use about `56px`; unresolved actions stay attached below the reply without consuming its writing width; and the fixed-record tool header uses no more than a `28px` visual slot while preserving a non-overlapping `44px` Adjust target. Typography, right-side icons, and Plan Agent MUST remain unchanged.
- **FR-022**: At `320–420px`, usable reply width MUST supersede FR-021's same-row category-action clause. The textarea MUST keep the annotation writing width instead of reserving `116–140px` for actions; one or two unresolved actions MUST form one compact right-aligned row immediately below the reply with a `0–4px` gap. At 390px the textarea box MUST be at least `220px` wide, and at 320px at least `160px`. The close action MUST retain a `44px` target, expose a visible inner glyph surface of about `28px`, and reserve prompt space so text does not run under it. Typography, compact record rows, right-side icons, Plan Agent, data, and explicit-write behavior MUST remain unchanged.
- **FR-023**: Category review prompts MUST NOT repeat the concrete `Domain / Category` path that is rendered as the separate category result label. Chinese and English prompts MUST remain generic while the visible path appears exactly once; this applies to both local fallback and normalized remote output.
- **FR-024**: Before rendering a review queue, Home MUST reconcile Agent items against the latest selected-day records and existing categories, dropping unknown records, duplicate record items, unsupported actions, invalid categories, and category suggestions that already match the record's current category. If a valid category suggestion becomes already-current after rendering, `Apply category` MUST show localized feedback, perform no write, and advance to the next item instead of silently returning or stalling the queue.
- **FR-025**: Initial analysis MUST evaluate each record in this order: offer one strongly supported non-current existing category; otherwise ask one question only when its answer can resolve two or three plausible existing categories or add a materially useful missing fact; otherwise omit the record from the review queue.
- **FR-026**: A classification-focused question MUST carry a transient goal plus two or three allowlisted, non-current candidate category IDs. A detail-focused question MUST carry no executable category choice. Neither goal nor candidate list may be persisted, synchronized, exported, or backed up.
- **FR-027**: Each diary reply MUST normalize to exactly one outcome: another targeted question, one faithful append proposal, one allowlisted existing-category proposal, or no change. Invalid, conflicting, simultaneous, unknown-category, non-candidate, and already-current proposals MUST become a safe no-change outcome.
- **FR-028**: A review item MUST accept no more than two user clarification answers. If the second answer still cannot support one safe proposal, the Agent MUST stop asking, explain that it cannot decide reliably, and retain Keep original as the only resolution.
- **FR-029**: A category proposed after clarification MUST reuse the existing explicit Apply category, no-write Keep original, queue advance, and undo behavior. Sending an answer, receiving a proposal, or displaying a category MUST NOT write any record field.
- **FR-030**: Deterministic local fallback MUST support the same bounded flow: one literal category match may be proposed directly, multiple literal matches produce a classification question, a clear candidate-name answer may produce one category proposal, and an unresolved answer must keep the original rather than guess.
- **FR-031**: Remote Diary analyze/reply execution MUST run through one embedded Mastra Agent and one transient Mastra Workflow that performs at most one structured model call followed by project-owned normalization. The public route payload, response, browser provider, local fallback, and Plan Agent execution path MUST remain unchanged.
- **FR-032**: The Diary Mastra Agent MUST register no tools or memory; its Workflow MUST use no persistent storage, snapshot, suspend/resume, background runner, or separately deployed server. Authentication, input bounds, record/category allowlists, two-answer limit, mutually exclusive outcomes, error mapping, and all write authority MUST remain owned by Log Note code outside the framework result.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly confirms an edit.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing `/organize` route remains a compatible fallback/direct-entry surface during this rework.
- **NR-005**: The existing quality gate MUST remain green.
- **NR-006**: Mastra-enabled releases MUST run on an upstream-supported Node.js version (`>=22.13.0` for the pinned `@mastra/core@1.63.2`). The existing Plus/Cargo/CatPaw Node 20 contract MUST NOT receive this change until its runtime is explicitly upgraded and independently verified, or the Mastra-enabled release is intentionally isolated from that path.

### Key Entities

- **Review session**: transient selected-day state containing status, current item, local messages, and cancellation lifecycle; never persisted.
- **Review item**: transient allowlisted reference to one current-day record plus action type, question/reply text, and optional existing category suggestion.
- **Question goal**: transient `clarify-category` or `enrich-detail` intent that determines which reply outcomes are valid; classification questions also carry two or three candidate category IDs.
- **Reply outcome**: transient mutually exclusive result of `ask`, `append`, `category`, or `none`; only a later explicit resolution may persist a change.
- **Explicit resolution**: a user-confirmed append, new-record, keep-original, or category-change operation applied through existing data boundaries.

## Success Criteria

### Measurable Outcomes

- **SC-001**: From an authenticated day with records, activating the Agent reaches the first anchored review row or a clear completed state within 2 seconds when local fallback is used.
- **SC-002**: In automated review journeys, 100% of persistent changes require an explicit action and 100% of source records retain their original content when the user chooses keep original or category-only filing.
- **SC-003**: At 320–1280px, all Agent/conversation controls have at least 44px hit areas, no horizontal overflow, and the right rail remains within 1px of its pre-session geometry.
- **SC-004**: Offline, timeout, invalid-output, and cancelled-session tests complete without blocking add/edit/delete or changing the current payload.
- **SC-005**: Focused unit, browser, design, PWA, and full quality-gate checks pass; real model wording remains a manual review item rather than fabricated evidence.
- **SC-006**: At 390×844, the closed-calendar header-to-record gap is no greater than 32px, the annotation stays within the record-content width, no inactive Agent helper spacer exceeds 8px during review, the active travelling illustration and dashed source underline are absent, every visible action target is at least 44px, and utility/export text labels are absent while their icons remain visible about 28px to the right of the binding line.
- **SC-007**: At 390×844, computed sizes follow `source record 16px > question 13px > category/action/reply hint 12px > Agent role 10px`; source and question use one coherent Sans family but different size/color roles, the role label uses Mono, and the actual reply input remains at least `16px`.
- **SC-008**: At 390×844, prompt/category/reply text left edges differ by no more than `1px`; the short source marker remains about `12px` left of that reading axis; progress precedes the upper-right close without overlap; action/conversation right edges differ by no more than `1px`; and the prompt-to-category gap is about `6px`.
- **SC-009**: At 390×844, the prompt differs from the source `.entry-content` left edge by no more than `1px`; category-to-reply is `2–8px`, reply-to-actions is `0–4px`, and actions-to-next-record is `8–14px`.
- **SC-010**: At 390×844 during Diary review, the closed date-context-to-timeline gap is `12–16px`, the active one-line source row is no taller than `52px`, one or two unresolved actions use one attached row below the reply, a three-action resolved state uses one row, and the fixed-record section begins after no more than `16px` of section separation while all real action targets remain at least `44px`.
- **SC-011**: At 390×844, the Agent summary ends no more than `18px` before the Record heading, the visible source gutter is no wider than `52px`, ordinary and first fixed rows are no taller than `56px`, unresolved actions remain within `4px` below the reply, and the fixed-tool header/first-row offset is no greater than `28px`; no horizontal overflow or Plan/right-rail geometry regression occurs.
- **SC-012**: At 390×844, the category reply textarea is at least `220px` wide; at 320×844 it is at least `160px`. One or two unresolved actions remain one horizontal right-aligned row `0–4px` below the input, all targets remain at least `44px`, the close glyph has an approximately `28px` visible surface with prompt clearance, and neither viewport overflows or changes Plan/right-rail geometry.
- **SC-013**: In Chinese and English category review states, the concrete category path is exposed once as the result label, while the Agent question remains generic and contains neither the domain nor category name.
- **SC-014**: Automated model and browser regression proves that same-current category suggestions are absent from a newly rendered queue, and a category that becomes current after rendering resolves as a no-write success with feedback and advances; valid category changes still write, advance, and remain undoable.
- **SC-015**: Model and browser regression proves the full classification path `direct category` or `ambiguous → question → one category proposal → explicit apply → undo`, with zero writes before Apply category and byte-for-byte preservation of content and unrelated fields.
- **SC-016**: In automated clarification journeys, 100% of reply results expose at most one persistent proposal, unknown/non-candidate/already-current categories are never actionable, and an unresolved item stops after at most two user answers.
- **SC-017**: Offline/no-token regression produces the same safe branch types without creating a category, guessing after ambiguity, blocking ordinary CRUD, or adding any persisted session field.
- **SC-018**: Runtime and route regression proves one registered tool-free/memory-free Diary Agent, one transient Workflow, exactly one model transport call per analyze/reply run, project normalization after framework generation, stable timeout/rate/invalid-output mapping, and an unchanged direct Plan path under Node `>=22.13.0`.

## Scope Boundaries

### In Scope

- In-page Agent activation, scan state, row anchoring, row-local follow-up/casual conversation, explicit append/new-record/keep/category actions, existing-category suggestions, local fallback, and compatible `/organize` fallback.
- A bounded analysis workflow that selects direct classification, classification clarification, detail clarification, or no review; reply outcomes remain mutually exclusive and session-only.
- Mobile composition refinement for header spacing, row-aligned annotation width, compact grouped actions, icon-only utility/export controls, quieter source attachment, and explicit question/category/help/action type hierarchy.

### Out of Scope

- Persistent chat history, autonomous reminders/tasks/calendar actions, generalized behavior coaching, learned classification preferences, cross-session feedback memory, new domains/categories/tags, automatic raw-note rewriting, multi-day background jobs, social features, a separately deployed general-purpose Agent/tool platform, and a new AI data schema.

## Assumptions and Dependencies

- LN-069 remains the authenticated bounded remote model boundary; LN-071 remains the existing-category allowlist and category-only write contract; LN-074 chronology logic remains reusable.
- LN-007/008/009 remain the gate for any future persisted observations, learned corrections, or broader AI feedback loops.
- The current rework may improve transient decision quality but does not satisfy or bypass LN-009's future learned-correction scope.
- The server-side execution mechanism may be replaced behind the existing bounded contract, but that replacement must not change request fields, response outcomes, persistence, authority, offline fallback, or explicit-write behavior.
- The current dirty working tree contains user-owned unrelated changes that must be preserved.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-003, US1 | Model tests and mobile screenshots for activation, scan, anchor, empty/Plan states | LN-074 single-day review rework |
| FR-004–FR-006, US2–US3 | Provider/model tests and browser flows for conversation and explicit writes/undo | LN-071 category safety + LN-074 traceability |
| FR-007–FR-009, Edge Cases | Route/provider tests for auth, limits, timeout, invalid output, cancellation, offline fallback | LN-069 safety boundary |
| FR-010, SC-003–SC-005 | `npm run design:check`, responsive browser/PWA/full gate and manual real-account wording review | LN-074 returned evidence |
| FR-011–FR-016, US4, SC-006 | Focused 390px DOM/geometry assertions, Chinese screenshot evidence, eight-width overflow review, and Plan Agent isolation regression | LN-074 Rework 4 screenshot acceptance |
| FR-017, US4.6, SC-007 | Computed-style hierarchy assertions plus refreshed Chinese 390px question/category screenshot | LN-074 Rework 5 screenshot acceptance |
| FR-018, US4.7, SC-008 | Computed rectangle/pseudo-element axis assertions plus refreshed Chinese 390px category screenshot | LN-074 Rework 6 alignment acceptance |
| FR-012, FR-017, FR-019, SC-007–SC-009 | Real `.entry-content` alignment, computed typography/proximity assertions, refreshed Chinese 390px screenshot, and Plan isolation regression | LN-074 Rework 7 hierarchy/proximity acceptance |
| FR-020, SC-010 | 390px geometry assertions plus question/category/resolved/Chinese screenshot comparison and Diary/Plan isolation | LN-074 Rework 10 density acceptance |
| FR-021, SC-011 | Community-layout evidence, 390px summary/gutter/row/tool geometry assertions, refreshed Chinese evidence, and Diary/Plan/date/rail isolation | LN-074 Rework 11 compact-grid acceptance |
| FR-022, SC-012 | Product-owner interaction evidence, 320/390px reply/action/close geometry, refreshed question/category/Chinese evidence, and Diary/Plan/date/rail isolation | LN-074 Rework 12 usability acceptance |
| FR-023, SC-013 | Model normalization tests and focused 390px category evidence proving one generic prompt plus one visible category path | LN-074 Rework 13 copy de-duplication |
| FR-024, SC-014 | Client reconciliation unit coverage plus focused Diary Agent browser flow for valid apply/advance/undo and stale same-current no-write advance | LN-074 Rework 15 queue-stall correction |
| FR-025–FR-030, US5, SC-015–SC-017 | Pure workflow/normalization tests plus a focused Diary Agent journey covering direct category, ambiguous question, reply-to-category, explicit apply/undo, turn cap, and local fallback | LN-074 Rework 18 analysis workflow |
