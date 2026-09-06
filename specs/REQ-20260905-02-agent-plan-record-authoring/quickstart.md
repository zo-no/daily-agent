# Quickstart: LN-085 Agent 计划与记录编写闭环

This guide is for local validation after LN-084 is independently accepted.

## Prerequisites

- Node.js 22.13 or newer.
- A paired, authenticated Log Note browser session.
- A synthetic account containing one local plan, one Google-origin read-only plan, one existing
  category, and one record with non-ASCII/Markdown content.

## Validation journey

1. Read the bounded date scope and categories; save the returned revision and fingerprints.
2. Propose one local plan update. Verify the settings panel shows the exact before/after values and
   that local state and backups are byte-identical before confirmation.
3. Confirm and commit it. Verify `applied=true`, the new revision, and a matching read-back object.
4. Repeat for record create, update, and delete. Verify raw text, category, tags, fields, and
   attachment references obey the explicit draft.
5. Attempt Google-plan write, unknown category, stale revision, expired proposal, duplicate commit,
   account switch, revocation, and offline commit. Every failure must be zero-write or an explicit
   idempotent result.
6. Run:

```bash
npm test -- tests/agent-plan-record*.test.mjs
npm run test:e2e
npm run check
```

## Verified local regression baseline (2026-09-05)

The package-focused plan, record, and lifecycle suites pass `7/7`. They cover local plan CRUD,
Google-origin read-only plans, invalid time blocks, stale and expired proposals, exact Markdown and
Unicode record content, existing-category enforcement, template/field/tag preservation, attachment
reference immutability, confirmation-before-write, offline refusal, account-local proposal state,
and queue replay/cancel/expiry/revocation. This is local synthetic evidence only; LN-084 must still
be independently Accepted before LN-085 is accepted, and real-account cloud CAS evidence remains
separate.

Record redacted real Codex/Claude evidence only after the local journey passes. Do not place tokens or
private records in this package.
