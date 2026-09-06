---
name: log-note-agent
description: Read and propose safe changes to Log Note plans and records through the paired MCP bridge.
---

# Log Note Agent

Use the paired Log Note MCP server when the user asks to read, create, edit, or delete a plan or
record. The MCP bridge is account-scoped to the currently paired Log Note browser. It is not a
database, credential store, or general-purpose automation channel.

## Domain meaning

- **Plan** means a future intention represented by one local time block with a date, start time,
  end time, title, and flexibility. A Google-origin plan is read-only.
- **Record** means a past or current fact represented by a date, optional time point, author text,
  one existing category, and optional existing structured fields, tags, or attachment references.
- Do not turn a plan into a record automatically. Do not infer that a record completed a plan.
- The first bridge version keeps records on the existing `date`/`time` model. Do not invent or send
  an `endTime` field.

## Required workflow

1. Read the smallest useful date or date-range snapshot first.
2. Use only the returned IDs, existing category IDs, revision, and source fingerprint.
3. For a write, create exactly one bounded plan or record proposal. Never call a write action as a
   hidden side effect of reading or conversation.
4. Show the user the exact target, operation, date/time, category when applicable, and before/after
   values. State that the proposal is preview-only.
5. Ask for explicit confirmation. A conversational “sounds good” is not enough unless the user is
   clearly confirming the displayed proposal.
6. Only after confirmation call `commit_change` with the original proposal ID, target,
   `expectedRevision`, source fingerprint, and `confirmation: "confirmed"`.
7. Report success only when the response contains `applied: true` and a read-back object. Mention
   the returned revision and any pending synchronization honestly.

## Safety boundaries

- Never request or handle Supabase service keys, Google tokens, passwords, browser storage, or
  complete account documents.
- Never send attachment bytes, image URLs, private Google event fields, or data from another
  account.
- Never create a category, rewrite raw record text implicitly, change attachments implicitly, or
  perform an unbounded batch operation.
- Google-origin plans remain read-only. Use existing local categories only.
- If the bridge reports stale revision, changed fingerprint, conflict, expiry, cancellation,
  pairing loss, browser loss, or offline write refusal, stop and explain that nothing was claimed
  as saved. Re-read before proposing again.
- Do not claim cloud persistence from a local preview or from a response without read-back evidence.

## Read actions

- `list_plans({ date })` — plans for one date.
- `list_records({ from, to })` — records for an inclusive range of at most seven days.
- `get_plan({ id, date })` and `get_record({ id, from, to })` — retrieve one target inside an
  explicit scope.
- `lognote://categories` — existing domains and categories.

## Write actions

- `propose_plan_change({ operation, targetId?, draft, expectedRevision, sourceFingerprint })`
- `propose_record_change({ operation, targetId?, draft, expectedRevision, sourceFingerprint })`
- `commit_change({ proposalId, confirmation, target, expectedRevision, sourceFingerprint })`

The bridge accepts `create`, `update`, and `delete`, but each proposal targets one plan or one
record. Unknown fields, invalid dates/times, missing categories, stale revisions, and Google-origin
plan writes must be rejected rather than repaired silently.
