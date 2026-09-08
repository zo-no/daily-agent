# Tasks: REQ-20260906-02

- [x] T001 Reconcile LN-083, existing Agent boundaries, dirty tree, and current Hero behavior.
- [x] T002 [US1] Create strict bounded model, authenticated route, and browser provider under `src/modules/diary/today-plan-clarification/`.
- [x] T003 [US1] Add disclosure/session orchestration and portaled clarification overlay under `src/app/_components/home/`.
- [x] T004 [US2] Add absolute record/plan markers without row or plan-canvas layout participation.
- [x] T005 [US3] Reuse `commitData` for explicit record replacement or plan-end ordinary-record creation.
- [x] T006 Add strict model/route/provider regression in `tests/today-plan-clarification.test.mjs`.
- [x] T007 Run Node 22 full gate and responsive browser evidence; record remaining shared failures separately.
- [x] T008 Update final evidence only after focused and full verification; do not commit, push, deploy, or mark Accepted.

## Verification evidence

- Focused Node 22 regression: 4/4 passed.
- `npm run design:check`: 11/11 passed.
- LN-083 responsive browser scenario: 1/1 passed, including detached marker geometry and focus return.
- Full Node 22 gate: 295/295 passed; the browser stage completed 42/42 scenarios.
- The three previously observed browser failures were shared/out-of-scope regressions: category hierarchy ledger inset, LN-076 grouped fixed-row inset, and the legacy Record-heading “Edit structure” link timeout. They were corrected and independently re-run; none is evidence against the LN-083 capability.
- PWA production build, installability, authenticated offline cache/persistence, and controlled-update checks passed in the same verification run.
- Real non-sensitive DeepSeek validation passed with synthetic English input: analyze 3/3 (747ms, 1038ms, 817ms) and reply 2/2 (632ms, 533ms); every result passed the strict schema, provider binding, and fingerprint echo checks. This does not establish real-user Chinese quality or long-term usefulness.
- Still open before `Accepted`: product-owner 390px visual confirmation, 14-day use/cancel/rewrite observation, target-environment deployment evidence, and real-user content-quality review.
- No commit, push, deploy, merge, or history rewrite was performed.

## Resumed implementation tasks

- [x] R001 Add Goal model, v5 state migration, optional Plan goal/priority metadata, and focused model tests.
- [x] R002 Add `/goals` CRUD and unlink-on-delete behavior.
- [x] R003 Extend the existing PlanEditor/Home call chain without changing Google read-only behavior.
- [x] R004 Add local plan/record evidence, bounded relation provider, strict route, and focused regression.
- [x] R005 Make batch classification the default organize task and add session-only plan/record metrics.
- [ ] R006 Run independent responsive acceptance, full quality gate, and record remaining evidence before Accepted.

## Resumed verification evidence

- Node 22 `npm test`: 345/345 passed, including Goal/Plan normalization and local plan-record evidence.
- `npm run design:check`: 11/11 passed; `npm run build` passed and includes `/goals` plus
  `/api/organize/plan-record-review`.
- `git diff --check` passed.
- Browser/PWA gate remains open: the latest completed run reached 32/44 scenarios before the
  stale smart-organize default assertion was updated to match batch classification. Existing shared
  dirty-tree geometry/search failures remain and the browser run needs a fresh pass. No Accepted
  status is inferred from the passing static gates.

## R006 follow-up: 2026-09-06

This follow-up started from a clean `master` at `ebbf126f676cd6586b826b254b9a97780eb7630b`.
The current changes repair plan/record evidence and complete responsive and offline verification
of the already introduced Goals page. They do not establish product acceptance or deployment.

### Change contract and replacement record

The write set is `src/modules/organize/plan-record-review/{model,client,server}.mjs`,
`src/app/organize/{organize-workspace.js,organize.css}`, `src/app/goals/goals.css`,
`src/lib/i18n.mjs`, `public/sw.js`, `tests/plan-record-review.test.mjs`,
`e2e/{run-mobile,run-pwa}.mjs`, and this file. Governance files, unrelated Search/hierarchy behavior,
account storage, schema migrations, plan writers, and deployment configuration are outside the set.

- Local evidence accepts `HH:mm:ss` and keeps the inclusive start / exclusive end rule. The full
  original record text, plan list, and locally calculated metrics remain authoritative after AI.
- The comparison action computes local evidence. A separate disclosure and explicit action permit
  one remote relation request, using temporary IDs, a request ID, date, and source fingerprint.
  Projection considers at most 100 local plans and the first 200 ordinary records; only records
  inside one of those plan windows are sent. Titles/texts are bounded to 240/360 characters.
  Plan-outside records, Google events, goal/category metadata, tags, and attachments stay local.
- Both boundaries enforce the strict `plan-record-relations-v1` transport. The model returns only
  `relations`; server-owned code adds response bindings after source validation. Unknown/duplicate
  sources and stale responses are rejected. Cancellation, source/date/task/account/locale changes,
  or unmount invalidate the pending session. This capability still has no `commitData` call.
- Goal controls retain at least 44px targets; inputs use the body text size and fit the editor.
  Existing management/editor and organize reading axes are reused. The time column now fits
  seconds. `/goals` joins the existing service-worker document and static-asset precache lists.
- Removed the server's reconstruction of incomplete facts, immediate remote analysis on Compare,
  permissive unversioned input sanitizing, and unused local-provider wrapper. Local fallback reuses
  the same fact builder; no compatibility copy of the obsolete behavior remains.

Change metrics: 0 parallel routes/persistence paths or dependencies added; comparison data writers
remain 0 → 0. Internal exports across the three capability modules are 9 → 12: four shared
schema/projection/validation exports replace one unused provider export. All have runtime callers;
HTTP route count is unchanged. At behavior-group granularity, additions/deletions are 5/4 (net +1):
second-precision evidence, approved/bound relations, exact model output/error handling, responsive
controls, and offline Goals replace the four obsolete behaviors above. Reuse is evidenced by
`stableFingerprint`, `postRemoteAiJson`, `runDeepSeekProposal`, the existing fact builder, shared
management layout, and service-worker precaching. Validation adds bounded mapping/allowlist loops
and explicit request lifecycle state, without another feature layer or storage owner.

### Verification and remaining evidence

- Baseline: `E2E_OUTPUT_DIR=output/req-20260906-02-baseline npm run check` under Node 22.22.0:
  design 11/11, Node 345/345, browser 32/44. Twelve browser failures were reproduced before fixes.
- Red regressions reproduced seconds being treated as outside, a successful remote response
  clearing the plan/record evidence, and a goal close target measuring approximately 32×29px.
  Adding the cold-install Goals regression also failed before the cache fix: the offline Goals
  navigation displayed the homepage and timed out waiting for the Goals heading after 20 seconds.
- Final focused model/route/provider regression: 11/11. It covers bounds, preserved raw text,
  omitted outside records, original-row mapping after projection, no-store/auth/rate limits,
  source allowlists, duplicate IDs, cancelled replies, and invalid/stale response fallback.
- Full browser run: `E2E_OUTPUT_DIR=output/req-20260906-02-final npm run check` reached 35/46.
  Both new feature scenarios and LN-083 clarification passed. Settings then failed at the remaining
  desktop six-link assertion; after correcting it to include Goals, the complete settings restore /
  Markdown export scenario passed 1/1 in `output/req-20260906-02-settings-final`.
- Ten shared baseline failures remain: three 24px-inset assertions (LN-076 Rework 14, category
  hierarchy, and LN-076 compact fixed rows), plus Search-dependent home reference, date picker,
  writing-plane, linear-record, Markdown-selection, date-led-header, and viewport-Agent scenarios.
  The first failure is `Grouped time text should keep the 24px semantic record inset`; actual
  grouped time and domain heading left edges are both 18px. The same snapshot also shows a 6px
  quick-input text difference. Downstream assertions in these failed scenarios remain unverified.
  The failures are recorded separately; no Search or hierarchy implementation was changed here.
- Real DeepSeek smoke uses synthetic Chinese sources only. Earlier responses echoed forbidden
  metadata or classified a record with no plan context; both were rejected. The final request
  sends two synthetic plan titles and two in-window records, succeeds once in 754ms, and returns
  `related` / `unrelated`. Strict schema/bindings pass; all three local records and metrics remain
  unchanged, with the outside record still uncertain. Evidence:
  `output/req-20260906-02-final/provider-synthetic.json`. This is one smoke test, not a claim about
  real-user Chinese quality, provider reliability, or 14-day usefulness.
- Final scoped gate: `E2E_TEST_FILTER=REQ-20260906-02 E2E_OUTPUT_DIR=output/req-20260906-02-verified npm run check` exited 0.
  Design 11/11, all Node tests 352/352, both affected browser scenarios 2/2, production build,
  complete PWA suite, and `git diff --check` passed. The filter limits only the mobile scenarios;
  this does not turn the unfiltered full-gate result into a pass.
- Browser evidence covers 320/390/426/768/1280px with at least 44px goal/action targets, no
  horizontal overflow, and at most 1px spread on the reused editor/analysis content axes.
  Second-precision time and record text keep at least an 8px gap. Chinese 390px screenshots were
  inspected. Goal CRUD, plan goal/priority persistence, cancelled deletion, unlink-on-delete,
  explicit AI approval, unchanged storage, stale response rejection, cancellation, and task
  switching pass. PWA proves first offline Goals navigation after an online home-only install,
  offline goal creation and refresh persistence, cache isolation, and controlled upgrades.
  Screenshots/traces/results are in `output/req-20260906-02-verified` and its `pwa` subdirectory.

R006 remains open for the shared full-gate failures and independent owner/target-environment
acceptance. Product-owner visual confirmation, real-user content review, deployment evidence,
and the 14-day use/cancel/rewrite observation are still open. No governance status, commit, push,
deployment, merge, or history rewrite is part of this follow-up.
