# Contract: Agent Plan Review

## Endpoint

`POST /api/organize/agent`

Uses the existing same-origin JSON, bearer authentication, request-size, rate-limit, timeout, and
error contract. Diary requests without `reviewTarget` remain interpreted as Diary for compatibility.

## Analyze request

```json
{
  "reviewTarget": "plan",
  "mode": "analyze",
  "date": "2026-08-23",
  "locale": "zh-CN",
  "plans": [
    { "id": "plan-local-1", "title": "处理一下", "startMinute": 540, "endMinute": 600 }
  ],
  "conflicts": [
    { "title": "团队会议", "startMinute": 570, "endMinute": 630 }
  ]
}
```

No Google/event/calendar ID, external reference, token, description, attendee, location, diary entry,
category, other date, or full data document is accepted in normalized Plan input.

## Analyze response

```json
{
  "providerId": "deepseek:deepseek-chat",
  "intro": "发现 1 个计划需要确认。",
  "items": [
    {
      "id": "agent-plan:0:plan-local-1",
      "planId": "plan-local-1",
      "kind": "plan-overlap",
      "prompt": "这个计划与 09:30–10:30 的团队会议重叠，要调整时间吗？",
      "proposal": { "planId": "plan-local-1", "startMinute": 630, "endMinute": 690 }
    }
  ],
  "analyzedPlanIds": ["plan-local-1"],
  "generatedAt": 1787443200000
}
```

Normalization drops unknown/duplicate plan IDs, invalid kinds/prompts, Google targets, cross-date
references, invalid minutes, partial time pairs, unchanged/empty proposals, and non-allowlisted fields.

## Reply request

The reply request repeats only the active local plan, bounded read-only conflicts, active item, and
last eight messages. `activePlanId` must match that local plan.

## Reply response

```json
{
  "reply": "可以把它挪到会议之后，保留一小时。",
  "proposal": { "planId": "plan-local-1", "startMinute": 630, "endMinute": 690 }
}
```

The response never includes or executes an action. The browser must independently show the preview
and require the user to choose “更新计划”.

## Browser write contract

Before delegating to the existing save path, the browser rechecks:

1. The active plan still exists in account-owned local state.
2. Its source is local and date still equals the selected date.
3. Proposal plan ID equals active plan ID.
4. Title/time fields are valid and materially changed.
5. Only proposed title/start/end fields are merged; every other field comes from current local state.

Failure produces no write and no update action.

## Browser presence contract

- Plan always renders the illustrated companion for the selected date.
- When at least one editable local plan exists, the companion exposes the existing wake button and the
  endpoint contract above remains unchanged.
- When there is no editable local plan, including Google-only days, the artwork is non-interactive and
  shows “编写计划后和我聊聊吧” in Chinese or its localized equivalent. It cannot dispatch analyze/reply,
  acquire a plan ID, or expose an update action.
