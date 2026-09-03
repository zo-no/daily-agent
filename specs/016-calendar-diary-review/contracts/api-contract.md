# API Contract: Calendar and Diary Review

## Endpoint

`POST /api/organize/day-review`, Node runtime, dynamic, authenticated, same-origin, private/no-store.

## Strict Request

```json
{
  "schemaVersion": "calendar-diary-review-v1",
  "requestId": "synthetic-run-1",
  "targetDate": "2026-09-04",
  "sourceFingerprint": "fnv1a-1234abcd",
  "locale": "zh-CN",
  "events": [{ "id": "event-001", "title": "项目评审", "startMinute": 600, "endMinute": 660, "allDay": false }],
  "entries": [{ "id": "entry-001", "time": "10:40", "content": "完成项目评审并记下三个决定" }]
}
```

Unknown keys reject. Limits are 40 events, 80 entries, 240 title characters, 4,000 entry characters, 256 KiB
body, one Provider call, zero retries, bounded timeout/response. Credentials, real IDs and all fields not shown are
forbidden. Authentication authorizes route use; the route does not fetch the account document or Google API.

## Success

```json
{
  "schemaVersion": "calendar-diary-review-v1",
  "requestId": "synthetic-run-1",
  "targetDate": "2026-09-04",
  "sourceFingerprint": "fnv1a-1234abcd",
  "overview": "日历中的评审已在记录里得到对应。",
  "suggestions": [],
  "providerId": "deepseek:deepseek-chat",
  "generatedAt": 1788451200000
}
```

Each suggestion has an allowed `kind`, bounded `title`/`summary`, and 1–4 source IDs from this request. Provider
failures use existing safe error codes/status classes and never include upstream bodies, input text, or secrets.
