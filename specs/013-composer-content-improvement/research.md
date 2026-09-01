# Research: Hero-Triggered Composer Content Improvement

## Decision 1: Reuse the writing area, not a chat or parallel preview

**Decision**: Render the candidate in the existing textarea and place only one compact review action
group below it.

**Rationale**: The owner explicitly rejected the heavier small-conversation treatment because the
mobile paper editor is space-constrained. A parallel pane duplicates text, reduces writing width,
and gives generated content equal visual authority.

**Alternatives considered**:

- Chat drawer or bubble: rejected by direct user feedback and adds prompt/history state.
- Separate modal: rejected because it leaves the paper context and adds navigation/focus complexity.
- Side-by-side diff: rejected at 320–426px because it harms readability and touch target geometry.

## Decision 2: Keep apply and save as separate explicit actions

**Decision**: `Use improved draft` changes only `draft.content`; existing `Done` remains the sole save.

**Rationale**: This preserves raw-note integrity, discard behavior, attachments/metadata review, and
the existing local-first/CAS path. It also makes “AI proposal accepted” distinct from “record saved.”

**Alternatives considered**:

- Apply and save in one action: rejected as surprising and incompatible with current editing semantics.
- Update the textarea as tokens stream: rejected because partial text is untrusted and hard to undo safely.

## Decision 3: One capability-specific route behind the shared runtime

**Decision**: Add `/api/records/improve`, `content-improvement` business modules, and one fixed Mastra
capability using the existing bounded DeepSeek adapter.

**Rationale**: Diary review explicitly asks questions and avoids rewriting; overloading it would weaken
its schema and prompt. A capability-specific route keeps auth, data minimization, output validation,
and removal auditable while reusing the canonical execution layer.

**Alternatives considered**:

- Reuse `/api/organize/agent`: rejected because its modes, payload, local fallback, and response are unrelated.
- Browser-to-provider call: rejected because it exposes secrets and bypasses server auth and bounds.
- Independent Agent runtime: rejected because the architecture prohibits a second HTTP/state boundary.

## Decision 4: Bind proposals to exact source text and target

**Decision**: Capture a session target, request ID, schema version, and deterministic source fingerprint;
validate/echo them and recheck against current composer state before preview or application.

**Rationale**: Component presence is not enough when a request can finish after editing, template change,
close/reopen, account change, or a later request. Binding makes stale rejection testable.

**Alternatives considered**:

- Compare only current text: rejected because two drafts may temporarily have equal text.
- Trust server timing/order: rejected because browser lifecycle and network order are independent.
- Persist proposal IDs: rejected because the proposal is intentionally session-only.

## Decision 5: No fabricated local “AI” fallback

**Decision**: When remote AI is unavailable, keep manual writing usable and show a compact unavailable
state; do not manufacture an “optimized” copy locally.

**Rationale**: Deterministic whitespace or punctuation cleanup would not satisfy semantic content
optimization and could be mistaken for model output. Zero-write failure is more honest.

## Decision 6: Data and performance limits

**Decision**: Limit source content to 4000 characters, request body to the existing 256 KiB boundary,
provider response to 512 KiB, model output to a conservative token budget, one call, zero retry, 20s
server timeout, and 25s browser timeout.

**Rationale**: The operation concerns one mobile note, not document editing. Existing shared limits are
already tested and operationally consistent with other optional AI paths.
