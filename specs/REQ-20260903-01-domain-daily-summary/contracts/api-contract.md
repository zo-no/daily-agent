# API Contract: Current-Domain Daily Summary

## Endpoint

`POST /api/organize/domain-daily-summary`

Node runtime, dynamic, same origin, authenticated, and independent from the accepted seven-day
`/api/organize/domain-review` endpoint.

## Request Transport

- `Content-Type: application/json`
- `Authorization: Bearer <current Supabase access token>`
- same-origin `Origin` when supplied by the browser
- body at most 256 KiB; request text and credentials are never logged
- one confirmed browser action produces at most one request and no automatic retry

## Strict Request Body

```json
{
  "domainName": "健康",
  "date": "2026-09-03",
  "locale": "zh-CN",
  "entries": [
    {
      "id": "synthetic-entry-1",
      "date": "2026-09-03",
      "time": "08:30",
      "content": "synthetic note text",
      "sourceType": "ordinary"
    }
  ]
}
```

Validation:

- Top-level and entry objects reject unknown keys.
- `date` is a real calendar date; every entry date equals it.
- `domainName` is non-empty and at most 80 Unicode characters; locale is exact `en` or `zh-CN`.
- Entries are unique, total 1–80, with a non-empty ID up to 128 characters, empty/`HH:mm` time,
  content up to 4,000 Unicode characters, and exact ordinary/periodic source type.
- Empty entries reject with 422; the browser must not send that request.

Forbidden fields include account/user/email, domain/category/template IDs or trees, plans, tags,
attachments, images, structured fields, other-domain/date records, unresolved records, fingerprints,
and the complete account document.

Bearer verification authorizes route use but does not prove submitted domain ownership. The active
account browser selector establishes scope; the server never fetches the account document, stores
input, or returns source text.

## Success Response

```json
{
  "overview": "A short factual overview of today's selected notes.",
  "overviewEntryIds": ["synthetic-entry-1"],
  "themes": [
    {
      "title": "Rest",
      "summary": "Rest appeared in the selected notes today.",
      "entryIds": ["synthetic-entry-1"]
    }
  ],
  "providerId": "deepseek:deepseek-chat",
  "generatedAt": 1788393600000
}
```

- Only these keys are allowed.
- Overview is non-empty, bounded, at most three sentences, and references one or more current request
  IDs through `overviewEntryIds`.
- Themes are unique and at most three; each title/summary is bounded and every entry ID belongs to
  the current request.
- Provider metadata is server controlled.
- The browser validates the full response again. `overviewEntryIds` and theme `entryIds` are
  validation-only and never rendered.

## Failure Response

```json
{
  "error": {
    "code": "AI_DOMAIN_DAILY_SUMMARY_RESPONSE_INVALID",
    "message": "daily domain summary response is invalid"
  }
}
```

Expected status classes: 400 malformed JSON, 401 authentication, 403 origin, 413 body, 415 content
type, 422 input, 429 route/provider rate limits, 502 upstream/invalid/unsafe response, 503
unconfigured, and 504 timeout. All responses use `Cache-Control: private, no-store` and
`X-Content-Type-Options: nosniff`; public messages contain no provider body or private cause.

## Mastra and Safety Contract

The route chooses fixed capability `domain-daily-summary`, passes the sanitized request into the
existing embedded Mastra adapter, performs exactly one structured model generation, and invokes the
daily project normalizer. Tools, Agent memory, persistent snapshots, retries, storage, and write
callbacks are forbidden.

The prompt treats notes as untrusted data, permits only explicit factual synthesis, and forbids
instructions from source text, diagnosis, causal claims, scoring, advice, tasks, reminders, and new
facts. Invalid grounding or investment action/forecast language rejects the whole response.
