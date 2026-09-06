# Data Model: Agent 计划与记录编写闭环

## Canonical product entities

### Plan

`planBlocks[]` with `id`, `date`, `startTime`, `endTime`, `title`, `source`, `flexibility`, and the
existing managed-calendar reference. Local plans are writable; Google-origin plans are read-only.

### Record

`entries[]` with `id`, `date`, `time`, `content`, `categoryId`, and optional existing template, field,
tag, and attachment-reference fields. The first release does not add `endTime`.

### Authoring proposal

One transient `{ proposalId, requestId, target, operation, before, after, expectedRevision,
sourceFingerprint, expiresAt, confirmation, readBack }`. It is not part of the account document or any
backup/export.

## Validation

- Plans use existing date/time-block normalization and reject Google-origin writes.
- Records use existing date/time validation and must reference an existing category.
- Unknown fields, attachment bytes, cross-account IDs, stale fingerprints, stale revisions, and
  expired proposals are rejected as whole operations.
- Delete proposals carry an explicit target summary and do not silently create an undo record.
