# Implementation Plan: Hero-Triggered Composer Content Improvement

**Board Item**: `LN-078` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

## Summary

Add one composer-local instance of the existing Hero to the ordinary free-text writing leaf. Its
single activation sends the current bounded text through a new authenticated same-origin route and
the existing embedded Mastra execution boundary. A strict candidate stays in composer state and is
shown in the same textarea with a compact original/candidate/use/cancel row. Explicit use changes
only `draft.content`; the existing `Done` performs the only `commitData`. Structured and periodic
editors, the application-shell Diary traveler, all other Agent flows, storage, sync, export, backup,
and deployment remain unchanged.

## Technical Context

**Runtime**: Node.js `>=22.13.0`, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: existing React, Zod, `@mastra/core`, shared DeepSeek model adapter; no new dependency
**Storage and Ownership**: candidate/request state only in `RecordComposer`; existing confirmed save remains account-scoped `commitData`
**Testing**: Node test runner, focused Playwright mobile E2E, PWA/full gate, design validation
**Target Platforms**: authenticated mobile-first browsers plus responsive desktop
**Performance Goals**: zero idle network/background cost, one model call, zero retry, 20s server and 25s client timeout, no duplicate request while pending
**Constraints**: local-first, account isolated, stale safe, raw-note explicit, offline manual path, backup compatible
**Scale/Scope**: one current free-text draft, 4000 source characters, one candidate, 256 KiB request and 512 KiB provider-response bounds, 320/390/426/1280px

## Source-of-Truth and Readiness Check

- [x] `LN-078` exists with outcome, dependencies, permissions, acceptance, validation, and exclusions.
- [x] `product.md` contains the durable admission, data boundary, 14-day window, and exit condition.
- [x] `DESIGN.md`, `docs/设计规范/AGENTS.md`, page rules, and feedback/motion rules were read; the prior
      “composer hides Agent” rule is reconciled as outer traveler hidden plus one composer-local Hero.
- [x] The dirty tree was inspected; the write set preserves unrelated product, AI, output, and deleted files.
- [x] The main checkout has one writer and no overlapping delegated work.

## Constitution Check

- [x] Opening and ordinary saving remain one action each; optimization is optional.
- [x] Authenticated offline manual writing, account ownership, and CAS/revision safety stay unchanged.
- [x] Generated text is an inert session proposal; use and save are two explicit author decisions.
- [x] Exact request fields, auth, secrets, limits, response validation, failure, backup, and removal are specified.
- [x] Mandatory model/route/provider/browser/PWA/design/full-gate tests cover success and failure.
- [x] The vertical slice is one free-text draft and excludes chat, structure, history, persistence, and deployment.
- [x] Implementation is authorized; commit, push, publish, deploy, deletion, reset, history rewrite,
      OKR change, and worktree merge are not authorized.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/page.js` owns the active draft, access token, existing save, and application-shell Agent visibility.
- Before LN-078, `src/app/record-composer.js` owned the ordinary textarea, formatting selection,
  details, attachments, close, and `Done` with no AI state; this feature adds only transient proposal state.
- `src/app/agent-appearance.js` and `src/lib/agent-appearance.mjs` provide the existing local four-state Hero.
- `src/app/entry-composer.css` owns the lifted paper leaf and responsive writing/detail geometry.
- `src/lib/ai-route-boundary.mjs` owns shared same-origin, JSON, Bearer, body, timeout, and response primitives.
- `src/lib/deepseek-model.mjs` owns server-only Provider construction and bounded response transport.
- The pre-change `src/mastra/index.mjs` allowlisted five fixed capabilities; LN-078 extends the same
  boundary to six with `content-improvement` without changing its no-tool/no-memory/no-snapshot contract.
- `src/app/api/organize/domain-review/route.js` and `src/lib/domain-review-route.mjs` demonstrate the
  authenticated thin Route Handler and capability-specific strict business boundary.
- `saveEntry` in `src/app/page.js` is the only existing ordinary-draft persistence path and must remain so.

### Reuse and Compatibility Decisions

Reuse `AgentAppearance`, the existing account session token, shared AI route boundary, bounded Provider,
Mastra execution adapter, `onDraftChange`, and `onSave`. Add a capability-specific pure model and route
instead of weakening Diary review prompts or creating a generic rewrite endpoint. No stored state,
schema member, migration, Service Worker asset, dependency, or compatibility URL is added.

## Proposed Design

### Data and Control Flow

```text
ordinary RecordComposer opens
  → outer Diary traveler stays hidden
  → composer-local Hero renders idle
  → tap with empty source: focus textarea + live message, zero request
  → tap with non-empty source:
      capture schemaVersion/requestId/target/sourceFingerprint/sourceContent
      Hero scanning; freeze ambiguous save/review mutation
      POST /api/records/improve with Bearer token
      route validates auth/origin/body/rate/input
      Mastra content-improvement executes one strict generation + project normalizer
      route echoes validated binding + improvedContent
      provider validates exact response and current AbortSignal
      composer rechecks request/target/fingerprint/current source
      valid: Hero complete + candidate in existing textarea + compact action row
      invalid/stale/failure: discard, zero write, compact live message
  → view original/candidate: presentation only
  → cancel: restore source view and proposal state only
  → use: onDraftChange(...content = improvedContent), proposal closes
  → existing Done: existing saveEntry → one commitData → local-first sync
```

The target is one random opaque key created for the current composer lifecycle and contains no entry
ID or account identity. The fingerprint is computed from the exact captured source text with a
deterministic browser/server-safe algorithm; it is a stale-binding value, not a secret or identity.
Any content, target, account-generation, template, or lifecycle change aborts and invalidates the
proposal. Empty, whitespace-only, or over-4000-character text is rejected in the browser with zero
request; server validation also rejects it rather than trimming or slicing the source.

### Trust and Privacy Boundaries

- Browser → same-origin route body: only schema version, request ID, target, fingerprint, locale, content.
- Bearer token: header only; verified through Supabase-compatible auth and omitted from body/logs/errors.
- Route → Provider: sanitized content and fixed system instructions; records are explicitly untrusted data.
- Provider secret/base URL/model: server environment only; never returned, logged, cached, or bundled.
- Input: exact content 1–4000 chars with at least one non-whitespace character; over-limit content is
  never sent or truncated. Random target/request/fingerprint are bounded and pattern checked; unknown
  keys are rejected.
- Output: strict `{ improvedContent }`; no explanation, IDs, instructions, or unknown keys; normalized to
  source-compatible text, bounded length, non-empty, and no invented facts/advice.
- Execution: one call, zero retry, no tool, memory, durable/application storage, snapshot, or write reference.
- Browser proposal: page session only; aborted/closed/stale/replaced results are discarded.

### UI and Interaction Contract

- Hero sits inside the writing leaf near the right paper edge, visually present but subordinate to text;
  its 44px button cannot cover textarea text, selection toolbar, `More`, `Done`, or native resize affordance.
- `idle → scanning → complete` reuses local assets; error returns to idle with an announced compact status.
- Candidate uses the same textarea and is read-only until chosen; no side-by-side columns or duplicate copy.
- One wrap-safe compact row provides a toggle labelled by the alternate view plus Use and Cancel. On 320px
  it may wrap internally while remaining one semantic action group, not a second panel.
- `Done`, formatting, details, attachments, template selection, and destructive actions are disabled or
  blocked during pending/candidate review; cancel/use returns them immediately.
- Escape with a candidate cancels the proposal before closing the composer; normal close/discard behavior
  remains unchanged afterward. Keyboard focus returns to Hero or textarea deliberately.
- All controls have visible focus and 44px targets. Reduced motion removes animated transitions.

## Project Structure and Write Set

```text
Read/reference:
  AGENTS.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md, DESIGN.md, docs/设计规范/**
  specs/012-mastra-ai-consolidation/**
  src/app/page.js, src/app/record-composer.js, src/app/agent-appearance.js
  src/lib/ai-route-boundary.mjs, src/lib/deepseek-model.mjs, src/mastra/**

Allowed changes:
  PROJECT_BOARD.md
  product.md
  ARCHITECTURE.md
  DESIGN.md
  docs/设计规范/规范/页面/记录与结构管理页面规范.md
  docs/设计规范/规范/交互/反馈与动效规范.md
  specs/README.md
  .specify/feature.json
  specs/013-composer-content-improvement/**
  src/app/page.js
  src/app/record-composer.js
  src/app/entry-composer.css
  src/app/api/records/improve/route.js
  src/lib/content-improvement-model.mjs
  src/lib/content-improvement-provider.mjs
  src/lib/content-improvement-route.mjs
  src/lib/i18n.mjs
  src/lib/public-policies.mjs
  src/mastra/index.mjs
  tests/content-improvement-model.test.mjs
  tests/content-improvement-provider.test.mjs
  tests/ai-content-improvement-route.test.mjs
  tests/agent-review-runtime.test.mjs
  tests/project-structure.test.mjs
  tests/public-policies.test.mjs
  e2e/run-mobile.mjs

Explicit exclusions:
  structured and periodic editor behavior
  Diary/Plan Agent review components, prompts, writes, and fallbacks
  template AI and specs/011
  data/storage/sync/backup schema, migrations, Service Worker, deployment configuration
  dependencies and package manifests unless a verified existing dependency correction is required
  unrelated dirty files, output cleanup, commit, push, publish, deploy, reset, history rewrite
```

**Integration Order**: one writer: truth/spec artifacts → failing model/provider/route/runtime/browser
contracts → pure model → server route and Mastra capability → browser provider → composer UI → focused
tests and visual evidence → design/full gate → board Returned evidence.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Model: exact request/response keys, normalization, no-truncation content bounds, Unicode/Markdown,
  empty/identical, fingerprint stability, unknown fields, prompt-injection treatment, and explicit
  fidelity/advice prohibitions in the fixed instructions.
- Provider: six-field body, Bearer only, one fetch, no empty request, abort/timeout/status mapping,
  strict echo/candidate validation, late result rejection, no leaked token/source in errors.
- Route: origin/content-type/body/auth/rate limits, sanitization, one Mastra call, strict response,
  unconfigured/timeout/rate/invalid mapping, private no-store/nosniff, zero write references.
- Runtime/structure: sixth fixed capability, one call/no retry/no tool/memory/storage/snapshot, canonical
  route/module imports, no parallel persistence or HTTP runtime.
- Browser: Hero ordinary-only, empty no request, pending dedupe, same-area candidate/original, identical
  result, cancel, use then existing Done, close/discard, stale/out-of-order, offline/error, Escape, focus,
  screen-reader names, formatting/details regression, 320/390/426/1280 geometry and 44px targets.
- PWA/account: existing authenticated offline, persistence, update, account generation, backup/restore.
- Design validation: updated composer/Agent/page/motion rules and focused screenshot review.
- Full gate: `npm run check` and `git diff --check`.

### Real-Environment or Manual Evidence

Synthetic fixtures do not send private notes. The owner must separately review real configured Provider
wording, factual preservation, latency, perceived visual weight, save understanding, and 14-day reuse.
Internal Node 20 deployment remains blocked; no deployment claim is made.

### Acceptance Evidence Handoff

Record exact focused/full counts, four-width screenshots, one-request/zero-write/stale evidence, no schema
or dependency change, rollback path, and open real-model/14-day checks in `PROJECT_BOARD.md`. Return is not
Accepted until independent comparison with this package and owner review.

## Rollback, Removal, and Migration

No migration exists. Remove the composer Hero and proposal state, browser provider, route handler,
model/route modules, Mastra capability ID, copy, CSS, and focused tests. Existing records, drafts,
attachments, account caches, cloud documents, exports, backups, and Service Worker state need no cleanup.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| One new strict AI capability and route | Existing Diary prompt prohibits rewriting and has a different data/output contract | Reusing it would mix review/chat with explicit draft improvement |
| Composer proposal state with fingerprint | Network responses can arrive after the source or target changes | Applying by component presence alone can overwrite newer text |
| Composer-local Hero mount | Owner explicitly selected Hero as the interaction while the outer traveler is hidden | A toolbar button or dialog contradicts the confirmed compact interaction |

## Post-Design Constitution Re-check

All gates remain passed. The design preserves the two-action manual path and offline CRUD, sends only
the declared current text on explicit tap, keeps output inert until use plus existing save, adds no
schema or persistent AI state, is independently removable, and authorizes no repository or deployment
action beyond local implementation and validation.
