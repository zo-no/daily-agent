# Feature Specification: Agent 计划与记录编写闭环

**Requirement**: `REQ-20260905-02`
**Legacy Board Item**: `LN-085`
**Feature Directory**: `REQ-20260905-02-agent-plan-record-authoring`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User request to let an external Agent read and safely write Log Note plans and records.

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This package refines one board item and cannot accept it.

## User Scenarios & Testing

Automated regression is mandatory for every story. Real-account evidence is separate from local tests.

### User Story 1 - Agent reads the right planning and recording context (Priority: P1)

After reading a bounded date scope, the Agent can distinguish future time-block plans from past or
current records and can use existing categories when preparing an action.

**Why this priority**: Writing without current context risks creating duplicates, assigning an invalid
category, or treating an intention as a fact.

**Independent Test**: With a fixture account containing local and Google-origin plans plus records,
read one day and a bounded record range, then verify the returned IDs, dates, source labels, categories,
revision, and fingerprints.

**Acceptance Scenarios**:

1. **Given** a day with plans and records, **When** the Agent reads it, **Then** plans are presented as
   future time blocks and records as dated facts, with Google-origin plans marked read-only.
2. **Given** an invalid category, out-of-scope ID, or over-wide date range, **When** the Agent requests
   context, **Then** the request is rejected without returning partial data.

### User Story 2 - Agent writes a plan through a reviewed change (Priority: P1)

The Agent can propose one local plan create, update, or delete operation. The user sees the exact
date, start/end time, title, flexibility, and before/after values before confirming.

**Why this priority**: Planning is the clearest time-block use case and must be safe before record
authoring is expanded.

**Independent Test**: Create, update, and delete local plans; reject writes to Google-origin plans;
verify confirmation, stale revision, duplicate submission, and read-back behavior.

**Acceptance Scenarios**:

1. **Given** a current local plan snapshot, **When** the user confirms a valid proposal, **Then** one
   normalized plan is committed and returned with its new revision and read-back object.
2. **Given** a Google-origin plan, stale fingerprint, expired proposal, or missing confirmation,
   **When** the Agent attempts to commit, **Then** no plan or backup data changes.

### User Story 3 - Agent writes a record without corrupting its raw fact (Priority: P1)

The Agent can propose one record create, update, or delete operation using an existing category. A
record keeps the existing date/time-point model in this release; the original text changes only when
the user explicitly confirms that text field.

**Why this priority**: Records are the product's durable factual history, so their authoring path must
preserve raw text, attachments, templates, and offline behavior.

**Independent Test**: Create, update, and delete records containing Markdown, Unicode, empty time, tags,
structured fields, and attachment references; verify only explicitly selected fields change and the
existing category allowlist is enforced.

**Acceptance Scenarios**:

1. **Given** an existing category and a valid record draft, **When** the user confirms it, **Then** the
   record is saved locally first, synchronized through the existing revision path, and read back with
   the exact confirmed content and category.
2. **Given** a proposal that invents a category, changes attachments implicitly, or rewrites content
   without explicit confirmation, **When** it is submitted, **Then** the whole operation is rejected.

### User Story 4 - Agent authoring remains reversible and account-safe (Priority: P1)

Account replacement, logout, browser loss, offline mode, cancellation, and concurrent revisions make
old proposals unusable while ordinary manual offline recording continues to work.

**Why this priority**: An external writer must not become a new persistence owner or bypass the app's
existing recovery guarantees.

**Independent Test**: Pair account A, create a pending proposal, switch to account B or revoke pairing,
then attempt the old commit; repeat while offline and during a concurrent revision update.

**Acceptance Scenarios**:

1. **Given** a proposal created for account A, **When** the session changes to account B, **Then** the
   proposal cannot read or write account B and no account A data is exposed through the new session.
2. **Given** an offline, cancelled, stale, or late request, **When** it reaches the bridge, **Then** no
   unconfirmed or falsely cloud-saved change is reported.

### Edge Cases

- Empty plans/records, duplicate IDs, invalid dates/times, over-wide ranges, oversized content, and
  unknown fields.
- Google-origin plans, missing categories/templates, attachment references, Markdown and emoji.
- Repeated proposal/commit requests, expired TTL, stale revision/fingerprint, and simultaneous edits.
- Logout, account switch, browser refresh/close, pairing revocation, network loss, and recovery.
- Old JSON/portable backups and Markdown export must remain readable without Agent metadata.

## Product Admission

### Core-Loop Contribution

Improves `browse → search → edit/delete` by making a natural-language Agent an optional, reviewed
authoring path while leaving quick manual recording unchanged.

### User Evidence

The product owner explicitly requested Agent plan writing, Agent record writing, and the ability to
read both. Existing page-local review Agents do not provide an external authoring contract.

### Default Interface and Recording Cost

No homepage control or required field is added. External writes require one visible proposal review and
explicit confirmation; manual quick recording remains unchanged.

### Offline, Account, Privacy, Reversibility, and Backup

The current authenticated browser remains the state owner. Writes use the existing local-first,
revision-checked commit path. Tokens, service keys, Google private fields, attachment bytes, complete
documents, and other-account data are excluded. Unconfirmed, stale, expired, cancelled, offline, or
conflicting operations are zero-write. Existing JSON, Markdown, and portable attachment backups do
not include Agent proposals or session state.

### Verification and Removability

Pure model/controller tests cover plan and record CRUD, allowlists, raw-text preservation, stale and
idempotent commits, and zero-write failures. Browser/PWA tests cover account switching, offline use,
confirmation focus, read-back, and unchanged manual flows. Removing this action family requires no data
migration.

### Exit Condition

Keep the capability secondary or remove it if users do not reuse it, confirmation is slower than manual
editing, a cross-account leak or silent overwrite occurs, or offline, backup, accessibility, or quality
gates regress.

### Admission Decision

- **Score**: `18/20`
- **Decision**: `mainline candidate`, gated by LN-084 and real-client evidence.
- **Red-line check**: no silent raw-text rewrite, no second store, no required recording step, and no
  Google-origin plan write.

## Requirements

### Functional Requirements

- **FR-001**: The Agent MUST read bounded plans, records, and existing categories before proposing a
  write.
- **FR-002**: Plan operations MUST support create, update, and delete for local time blocks only.
- **FR-003**: Record operations MUST support create, update, and delete using the existing date/time,
  content, and category semantics.
- **FR-004**: Every write MUST be preview-only until the user explicitly confirms the exact proposal.
- **FR-005**: Commit MUST re-check account/session binding, target, allowlists, fingerprint, revision,
  expiry, and idempotency before one atomic local-first commit.
- **FR-006**: A successful commit MUST return normalized read-back data and the resulting revision;
  without read-back the system MUST NOT claim the change was saved.
- **FR-007**: Record content, tags, templates, fields, and attachments MUST change only when included
  in the confirmed, validated operation; attachment bytes are never accepted by the Agent action.
- **FR-008**: The first release MUST NOT add a persisted record `endTime` or silently reinterpret the
  existing `time` field. A future interval-record model requires a separate schema and backup decision.
- **FR-009**: Google-origin plans, invented categories, unbounded batch operations, and direct cloud
  writes MUST be rejected.
- **FR-010**: Account switch, logout, revocation, offline refusal, cancellation, stale state, and late
  responses MUST preserve current data and manual offline use.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note text remains byte-for-byte unchanged unless explicitly confirmed by the user.
- **NR-002**: All changes use the current account's local-first revision/CAS persistence path.
- **NR-003**: Existing backup, restore, export, attachment, and old-data behavior remains compatible.
- **NR-004**: Plan and record semantics remain distinct; completing a plan does not create a record.
- **NR-005**: The repository quality gate and responsive/accessibility contracts remain green.

### Key Entities

- **Plan**: one future local or Google-origin time block; only local plans are writable.
- **Record**: one dated fact with an optional time point, author text, one existing category, and
  optional existing structured metadata.
- **Authoring Proposal**: one target, one operation, expected revision, source fingerprint, expiry,
  explicit confirmation, and read-back result.

## Success Criteria

- **SC-001**: A paired Agent can read the requested plan/record scope and identify its account,
  revision, source, and truncation status without exposing data outside the scope.
- **SC-002**: 100% of valid confirmed CRUD operations produce exactly one normalized read-back result;
  100% of unconfirmed, stale, expired, cancelled, offline, or unauthorized operations produce zero
  writes.
- **SC-003**: Manual quick recording, authenticated offline CRUD, and supported backups pass unchanged
  before and after the Agent action family is enabled.
- **SC-004**: A real Codex or Claude client completes one plan and one record read/propose/confirm/
  commit/read-back journey on a synthetic test account before this item is accepted.

## Scope Boundaries

### In Scope

- Plan and record action semantics on top of LN-084's paired bridge.
- Single-target create/update/delete, explicit confirmation, stale checks, read-back, and safety tests.
- Existing category selection and current date/time record semantics.

### Out of Scope

- MCP transport, pairing protocol, or Skill discovery (LN-084).
- Google Calendar near-realtime synchronization (LN-086).
- Persisted record intervals/end times, automatic plan completion, category creation, batch writes,
  Agent memory, reminders, and direct Supabase/service-role access.

## Assumptions and Dependencies

- LN-084 is independently Accepted before implementation begins.
- The existing `planBlocks`, `entries`, normalization, backup, and `commitData` paths remain canonical.
- A record interval, if later required, is a new separately approved schema rather than an implicit
  extension of this item.

## Evidence Mapping

| Requirement | Evidence |
| --- | --- |
| FR-001–FR-003 | Read and CRUD model/controller regressions plus MCP/browser journey |
| FR-004–FR-007 | Proposal, confirmation, atomic commit, raw-text and read-back tests |
| FR-008–FR-010 | Schema compatibility, account/offline/revocation/stale regressions |
| SC-001–SC-004 | Focused tests, `npm run check`, and redacted real-client evidence |
