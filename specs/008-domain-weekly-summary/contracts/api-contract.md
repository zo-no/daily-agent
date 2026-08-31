# API Contract: Seven-Day Domain Summary

## Endpoint

`POST /api/organize/domain-review`

Node runtime, dynamic, same origin, authenticated. It is independent of `/api/organize/review` and
`/api/organize/agent`.

## Request headers and transport

- `Content-Type: application/json`
- `Authorization: Bearer <current Supabase access token>`
- Same-origin `Origin` when the browser supplies one
- Body at most 256 KiB, private text never logged

## Strict request body

```json
{
  "windowStart": "2026-08-25",
  "windowEnd": "2026-08-31",
  "domainName": "健康",
  "locale": "zh-CN",
  "entries": [
    {
      "id": "synthetic-entry-1",
      "date": "2026-08-31",
      "time": "08:30",
      "content": "synthetic note text",
      "sourceType": "ordinary"
    }
  ]
}
```

Validation:

- Body and every entry object reject unknown keys.
- Dates are real local dates and span exactly seven inclusive natural days.
- Entries are unique, inside the window, at most 80, and contain valid empty/`HH:mm` time.
- `domainName` is non-empty and at most 80 characters; locale normalizes to `en` or `zh-CN`.
- Content may be an explicit empty string and is at most 4000 Unicode characters; source type is exact.
- Empty entries reject with 422. The browser must avoid this request.

Forbidden fields include account/user/email, tags, attachments, images, field values, category or
domain IDs/tree, template ID, created/updated timestamps, plans, other-domain records, and document.

Authentication authorizes route use; this endpoint does not read the account document or claim to
prove source ownership server-side. The account-isolated browser payload and selector establish the
current account/domain scope. The server treats submitted IDs/text as untrusted request data, never
dereferences another account, never stores input, and returns no source text.

## Success response

```json
{
  "overview": "A short factual overview.",
  "themes": [
    {
      "title": "Rest",
      "summary": "Rest appeared repeatedly in the selected notes.",
      "entryIds": ["synthetic-entry-1"]
    }
  ],
  "providerId": "deepseek:deepseek-chat",
  "generatedAt": 1788134400000
}
```

- Only these top-level and theme keys are allowed.
- Overview is non-empty, bounded, and at most three sentences.
- Themes are unique and at most three; each title/summary is bounded and entry IDs must all belong
  to the request.
- `providerId` and `generatedAt` are server controlled.
- The browser validates the response again and never renders `entryIds`.

## Failure response

```json
{
  "error": {
    "code": "AI_DOMAIN_REVIEW_RESPONSE_INVALID",
    "message": "domain review response is invalid"
  }
}
```

Expected status classes: 400 malformed JSON, 401 auth, 403 origin, 413 body, 415 content type, 422
input, 429 route/provider rate limits, 502 upstream/invalid/unsafe response, 503 unconfigured, 504
timeout. Every response uses `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.

## Model safety

The model receives the sanitized request only and is told to treat notes as untrusted data, use
only explicit facts/themes, return JSON only, and avoid diagnosis, causal claims, scoring, advice,
or long quotations. Any unknown ID, duplicate theme, schema/length violation, or investment-like
domain response containing actionable/security/price/position/allocation/return/forecast language
rejects the entire response.
