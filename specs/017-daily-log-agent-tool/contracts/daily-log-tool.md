# Contract: `prepare-daily-log`

## Purpose

Create one deterministic, explicitly unsaved Log Note record candidate from caller-supplied work facts.
This is a proposal Tool, not a persistence Tool.

## Mastra registration

- Tool export: `prepareDailyLogTool`
- Tool ID and Agent-local key: `prepare-daily-log`
- Agent factory export: `createDailyLogAgent`
- Agent ID: `daily-log-agent`
- Tool implementation signature: `execute(inputData, context)`

## Input

```json
{
  "schemaVersion": 1,
  "targetDate": "2026-09-04",
  "locale": "zh-CN",
  "items": [
    {
      "id": "work-1",
      "status": "completed",
      "summary": "完成今日工作总结 Tool 的契约设计"
    },
    {
      "id": "work-2",
      "status": "in-progress",
      "summary": "等待接入 Log Note 页面确认流程"
    }
  ]
}
```

Strict rules:

- No unknown object fields.
- `targetDate` is a real `YYYY-MM-DD` date.
- `locale` is `zh-CN` or `en`.
- 1–30 unique work items.
- IDs are 1–96 Unicode characters after trimming.
- Summaries are 1–800 Unicode characters.
- IDs plus summaries total at most 8,000 Unicode characters.
- Status is exactly `completed`, `in-progress`, or `blocked`.

## Output

```json
{
  "schemaVersion": 1,
  "kind": "daily-work-log",
  "targetDate": "2026-09-04",
  "locale": "zh-CN",
  "sourceIds": ["work-1", "work-2"],
  "sourceFingerprint": "fnv1a-00000000",
  "recordCandidate": {
    "date": "2026-09-04",
    "time": "",
    "content": "今日工作总结\n\n已完成：\n- 完成今日工作总结 Tool 的契约设计\n\n进行中：\n- 等待接入 Log Note 页面确认流程"
  },
  "writePolicy": "preview-required"
}
```

The fingerprint above is illustrative. Callers must treat the actual Tool output as authoritative and
must not precompute or persist it as a Log Note entry ID. FNV-1a is a deterministic change detector for
this bounded preview contract, not a cryptographic signature, authorization token, or uniqueness guarantee.

## Guarantees

- Same normalized input produces the same content and fingerprint.
- Each supplied item appears exactly once, under its supplied status.
- Empty status groups are omitted.
- No work time, account, category, template, tag, or persistence state is invented.
- The Tool reads no network, file, browser storage, Log Note state, Agent memory, or Supabase data.
- `writePolicy` is always `preview-required`; the Tool never reports `saved` or `committed`.

## Errors

- Invalid input: strict schema validation error; no partial output.
- Pre-aborted execution: `AbortError`; no core execution or partial output.
- There are no retry, persistence, network, or Provider errors in standalone Tool execution.

## Caller obligations

- Determine the intended local date before calling.
- Supply only facts authorized for this call; do not place secrets or private production snapshots in Studio.
- Display the candidate and state clearly that it is unsaved.
- A future product writer must explicitly confirm, re-read current account/target/fingerprint, build the
  full entry through the canonical quick-record rules, execute one atomic `commitData`, and verify read-back.
- A future Codex integration must expose this contract through an authenticated/approved MCP adapter;
  registering a Mastra Tool alone does not make it visible to Codex.
