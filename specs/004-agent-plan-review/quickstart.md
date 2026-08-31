# Quickstart Validation: In-page Agent Plan Review

## Prerequisites

- Use synthetic plan titles only.
- Install existing dependencies and configure the normal local test environment.
- For remote wording review, provide the existing Supabase and DeepSeek environment values; otherwise
  the deterministic local fallback is the expected provider.

## Focused automated checks

```sh
npm test -- tests/agent-review-model.test.mjs tests/ai-agent-review-route.test.mjs
npm run design:check
```

Run the Plan Agent journey through the repository's existing mobile browser harness, then run:

```sh
npm run check
git diff --check
```

## Scenario 1: wake and anchor

1. Seed two selected-day local plans with overlapping times and one vague title.
2. Enter Plan and wake the Agent.
3. Expect scanning to settle within 2 seconds, one local plan to be active, the grid/rail to keep its
   geometry, and no persisted field to change.
4. Repeat with Google-only and empty days; expect the illustrated Agent and one-line passive invitation
   to remain visible, with no wake button, review request, or stored change.

## Scenario 2: discuss without writing

1. Reply to the active prompt.
2. Expect the conversation and any proposal preview to remain attached to the same plan.
3. Compare the stored plan before/after chat and after “保持原计划”; expect exact equality.

## Scenario 3: explicit update

1. Exercise a title-only and time-only proposal.
2. Choose “更新计划”.
3. Expect only proposed fields to change through the normal save path.
4. Inject unknown IDs, invalid minutes, partial time ranges, another date, and Google-shaped targets;
   expect no update action and zero writes.

## Scenario 4: cancellation and responsive layout

During scanning/review, switch date, open the Plan editor, switch to Diary, and open Calendar/Search/
Settings. Each transition must abort and clear the Plan session. Capture idle, scanning, prompt,
proposal, and complete states at 320, 390, 426, 700, and 1280px. Also capture empty and Google-only
passive states. Confirm the Chinese invitation stays on one line at 320px, actionable controls retain
44px targets, mobile actions remain vertical, and there is no horizontal overflow or overlap with the
add button/right rail.

## Evidence handoff

Place screenshots/logs under `output/ln-074-plan-agent-review/` and record exact focused/full test counts,
fallback/provider mode, responsive geometry, and remaining real-model wording review in `PROJECT_BOARD.md`.
