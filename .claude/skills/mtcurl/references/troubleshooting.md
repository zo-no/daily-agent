# mtcurl Troubleshooting

Use this when an mtcurl request fails or returns unexpected content. The goal is for the agent to inspect the runtime, identify the auth source, and recover without asking the user for manual steps first.

## 1. Classify The Response

| Symptom | Meaning | Next move |
|---|---|---|
| HTTP 200 but body is an HTML SSO login page (`text/html`, contains login form / auth redirect) | Authentication failure, NOT business success | Go to section 2 |
| 401 Unauthorized | Missing or expired SSO credential | Go to section 2 |
| 403 Forbidden | Authenticated but no resource permission | Stop retrying; contact the service owner for access |
| Timeout | Slow backend or wrong network | Retry once with `-m 60`; confirm the host is reachable from this runtime |
| SSL/certificate errors (`self-signed certificate`, `UnknownIssuer`) | Missing platform CA in this runtime | Set `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` to a trusted CA file; use `-k` only for a short reachability check |
| One-shot AppConfig flags seemingly ignored | URL does not match `url_patterns` | Run `--explain-auth`, then pass `--client-id` / `--sso-base-url` explicitly or fix `url_patterns` |
| Token-authenticated endpoint rejects unexpected CLIGuard parameters/signatures | CLIGuard signing is incompatible with that endpoint | Retry once with `--skip-cliguard`; keep SSO enabled unless the endpoint also requires `--skip-sso` |

Classification nuances (verified against MWS-style SPA consoles):

- A successful SPA HTML shell may reference an SSO-hosted device/guard script. Do not classify that reference alone as
  a login page; a real login response has an SSO final URL or an explicit `/sson/login` route.
- A `MT-Gateway-Error: true` response header alone is not a failure verdict. Check HTTP status, content type/body, and
  exception headers; a valid HTML shell or JSON response can carry that header.
- For SPA consoles, prefer the JSON API for structured data; fetch an HTML page route only when the page shell or
  chunk references are actually needed.

Before retrying a business request, run the read-only plan inspection:

```bash
mtcurl --explain-auth '<url>'
```

It may probe an unauthenticated SSO redirect, but it does not send the business request, read credentials, or persist
AppConfig. Then re-run the failing request with `-v` once to see the HTTP status, content type, and selected auth source.

## 2. Auth Failure Triage

In default `--auth-mode auto`, mtcurl resolves credentials through the CLI-supported providers in this order:

1. Managed runtime provider, when the request runs in a supported cloud or sandbox environment.
2. Local authenticated session, when previously established through the normal developer login flow.
3. Desktop browser-compatible provider, when available on a local machine.

Check each in order; do not assume a desktop browser profile exists in cloud or headless runtimes. To isolate the
failing stage, force one provider family:

```bash
# Managed runtime identity only
mtcurl --auth-mode env --non-interactive -v '<url>'

# Existing headless browser session via CDP only
mtcurl --auth-mode browser-cookie --cookie-source cdp \
  --cdp-url '<cdp-endpoint>' --non-interactive -v '<url>'

# A specific local browser cookie database only
mtcurl --auth-mode browser-cookie --cookie-source browser-db \
  --browser chrome --browser-profile Default -v '<url>'
```

`--cdp-url` by itself only selects the endpoint; it does not force CDP. `--non-interactive` permits passive CDP reads
but blocks browser launch, navigation, and manual login.

### 2.1 Platform Auth Probe Cache

Some runtimes cache a failed platform auth probe for a short period. Symptom: the user has signed in after an earlier failed attempt, but `mtcurl` still gets 401 or an HTML login page.

Recover with the shared auth diagnostics:

```bash
mtdev auth status
mtdev auth moa status --probe
mtdev auth moa reset
```

Then retry the failing request once with verbose output:

```bash
mtcurl -v <url>
```

If the platform auth check still fails, fix the runtime login state first. Do not print secrets or raw credential payloads.

### 2.2 Managed Runtimes

- In managed runtimes, verify the platform auth status before retrying business requests.
- There may be no readable desktop cookie database in headless sandboxes. If the runtime exposes an existing Chromium
  CDP endpoint, use the strict CDP command above; otherwise use `--auth-mode env --non-interactive` and fix the platform
  identity instead of retrying browser fallback repeatedly.
- For a business smoke test, prefer a small JSON endpoint and report only status, content type, and whether the response shape is expected.

### 2.3 Local Desktop Path

- Ensure the user is logged in to any Meituan service in a supported browser (Chrome/Firefox/Safari/Edge).
- Prefer request-scoped `--browser` and `--browser-profile`; `sso.default_browser` in the local config remains the default.
- After a fresh browser login, simply re-run the request.

### 2.4 Cache Isolation

Use `--no-token-cache` when validating whether a recently validated app cookie or OIDC audience-token cache is masking
the current provider result. It does not disable validated secure-storage fallback in `cookie-source=auto`; use strict
`--cookie-source cdp` or `browser-db` when the exact browser source must be exercised.

### 2.5 CLIGuard Isolation

If an endpoint authenticates with its own token and rejects CLIGuard-added URL parameters or signature headers, use:

```bash
mtcurl --skip-cliguard -H 'Authorization: Token <token>' '<url>'
```

`--skip-cliguard` is request-scoped and does not disable SSO. Combine it with `--skip-sso` only when the endpoint is
fully authenticated by its own token. It does not bypass TLS verification or resource permissions.

## 3. Evidence To Collect Before Escalating

If self-recovery fails, gather (redacted) evidence and ask the user to contact `pingxumeng` on 大象:

- The exact mtcurl command (mask secrets) and `-v` output summary: HTTP status, content type, auth source.
- Runtime: local / CatPaw / CatClaw / 1024/OpenClaw / CatX, plus `env | rg 'RUNTIME_ENV|SANDBOX_ID|CATPAW'`.
- Auth diagnostic summary from `mtdev auth status`, with secrets redacted.
- Never include raw secrets, browser session values, or credential payloads.
