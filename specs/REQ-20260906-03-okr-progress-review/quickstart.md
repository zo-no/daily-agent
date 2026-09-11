# Quickstart: personal OKR period alignment review

**Requirement**: `REQ-20260906-03`
**Status**: Design-only until owner discussion and board admission.

## Local review scenarios

1. Use one authenticated test account and create two Goals in the same shared list. Give one a valid
   period and one no KR; do not classify either as work or life in the data model.
2. Add a local plan before, inside and after the first period. Add ordinary records inside the period,
   a future-dated record, an irrelevant record and a record associated with another Goal. Confirm the
   Goal snapshot filters by account and business date, not by manual association.
3. Open the Goal detail. Confirm the page shows the period, checked-at boundary, plan/record counts,
   omitted/invalid state, and excerpt policy before any request. Confirm there is one primary review action.
4. With synthetic provider data, click **检查目标对齐** once. Confirm one request, one model call, cited
   sources, the five status values, separate plan activity/evidence coverage, and no `commitData` call.
5. Repeat with no sources, only plans, conflicting records, invalid period, period over 366 days,
   offline mode, account replacement, changed Goal, cancellation, timeout, invalid response and late
   response. Confirm safe explanatory states and zero writes.
6. Verify raw records, legacy Goal associations, local plans, old JSON backup/restore and Markdown export
   are byte/content compatible. Verify 320/390/426/768/1280px focus, target, overflow and reduced motion.

## Commands after implementation permission

```bash
npm test
npm run design:check
npm run check
git diff --check
```

Focused tests should run before the full gate: Goal/period model, plan/record snapshot, alignment
contract/route, one-button browser journey, account/offline and backup compatibility.

## Manual evidence

Use the feature for 14 days without separating work and life spaces. Record review count, review time,
which cited facts were useful, incorrect/unsupported judgments, and whether the normal recording habit
changed. Real provider quality, cross-device CAS, deployment, and owner visual review remain separate
acceptance evidence.
