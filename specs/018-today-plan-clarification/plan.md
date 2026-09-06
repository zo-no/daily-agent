# Implementation Plan: REQ-20260906-02

Use a dedicated `modules/diary/today-plan-clarification` capability: browser projection produces
opaque IDs and a fingerprint; its authenticated route validates a strict request, uses the existing
one-shot Mastra/DeepSeek structured-proposal boundary, and returns inert targets or reply outcomes.

Homepage session state owns disclosure, request cancellation, marker mapping, stale invalidation, and
explicit `commitData` application. A portaled overlay owns focus and responsive presentation. Record
and plan markers are absolutely positioned sibling controls; no review panel is inserted after a row.

Tests cover the contract/route/provider and browser geometry. The Hero's prior row-inline Diary review
is no longer activated by the side Hero; composer improvement and Plan Agent remain unchanged. The
resumed implementation extends this package with:

1. Versioned Goal normalization and optional local plan `goalId`/`priority` fields, with old backup
   compatibility and unchanged Google sync fingerprints.
2. `/goals` CRUD through account-scoped `commitData`; deleting a goal only unlinks local plans.
3. Goal/priority controls in the existing PlanEditor and Home calendar call chain.
4. Deterministic plan/record time evidence plus a strict authenticated bounded relation provider.
5. Batch classification as the default `/organize` task, with secondary timeline review and a
   session-only read-only comparison surface.
