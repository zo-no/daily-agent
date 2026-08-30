---
name: mtcurl
description: "Curl-like CLI tool for Meituan internal network (`.sankuai.com`) with automatic SSO authentication. Use when users need to make authenticated HTTP requests to Meituan internal services or APIs. Execute `mtcurl --help` for command discovery."

metadata:
  skillhub.creator: "pingxumeng"
  skillhub.updater: "pingxumeng"
  skillhub.version: "V12"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "4617"
---

# mtcurl - Meituan Internal Network HTTP Client

Curl-compatible CLI for Meituan's internal network. Standard curl syntax, automatic SSO authentication.

## Installation

- Install: `UV_INDEX_URL=https://pypi.sankuai.com/simple/ uv tool install mt-curl-cli`
- Upgrade: `UV_INDEX_URL=https://pypi.sankuai.com/simple/ uv tool upgrade mt-curl-cli`
- Verify: `mtcurl --version`

## When to Use

Trigger immediately when the user provides a `.sankuai.com` URL with HTTP intent, needs to call an
authenticated internal API, or another skill needs to fetch a raw internal URL. Do not wait for an
explicit "use mtcurl".

**Do NOT trigger** if the user needs Python code with authenticated requests (use the Python SSO
client skill) or is browsing a KM doc (use the KM/学城 skill).

## Key Differences from Standard curl

- SSO authentication is automatic. Call `mtcurl` with **no auth flags** and let it choose the provider.
- Options must come **before** the URL; `mtcurl <url> -o file` fails with `No such command '-o'`.
- Default timeout 30s (`-m` to override). Redirects are opt-in with `-L`; auth credentials never cross origins.
- Without `-f`, 4xx/5xx bodies are returned like curl; `-f` makes HTTP errors fail the command.
- Pipes receive raw response bytes; JSON pretty-printing is terminal-only. `--format json` gives a structured envelope.
- Binary responses are never auto-saved; use `-o <file>`.
- `-d` sends the body verbatim: valid JSON gets `application/json`, otherwise `application/x-www-form-urlencoded`.
- Core curl flags supported: `-X -H -d -F -v -I -L -o -k -m -f`.

## Quick Examples

```bash
mtcurl https://km.sankuai.com/api/search?keyword=architecture   # GET, auto SSO
mtcurl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' URL
mtcurl -X POST -d @request.json URL                             # body from file
mtcurl -F "file=@/path/to/document.pdf" URL                     # multipart upload
mtcurl -v URL                                                   # debug: shows auth source + response headers
mtcurl --format json URL                                        # structured output (body Base64 for binary)
mtcurl -o response.pdf URL                                      # save binary
mtcurl --skip-sso https://public.sankuai.com/api/health         # public endpoint, no SSO
```

## Authentication

Default `auto` mode works for almost all internal URLs — try it first with no auth flags.

- **Unsure about client id / environment / provider?** Run `mtcurl --explain-auth '<url>'` first.
  It prints a secret-free plan and sends no business request.
- **Verdict rule**: HTTP 200 whose body is an HTML SSO login page = authentication failure, not success.
- **`--skip-cliguard`**: only for endpoints with their own token auth that reject CLIGuard
  parameters/signatures (`mtcurl --skip-cliguard -H 'Authorization: Token <t>' URL`). SSO stays
  enabled; never use it as a blind 401/403 retry.

Local desktop prerequisite: normal Meituan login state (verify with `mtdev auth status`). Managed
runtimes: use the platform identity provider; don't assume a local browser exists.

## References (load on demand)

| When | Load |
|---|---|
| Any auth failure: 401, or 200 returning an HTML login page; SSL/CA errors; timeout triage | [references/troubleshooting.md](references/troubleshooting.md) |
| Need a specific browser/profile/CDP session, headless or managed runtime auth, `--auth-mode` / `--cookie-source` / `--non-interactive` details | [references/auth-strategies.md](references/auth-strategies.md) |
| Need `--client-id`, custom SSO cookie name, `--app-config` JSON, auto-discovery details, or manual repair of `~/.meituan_sso_apps.json` | [references/appconfig.md](references/appconfig.md) |
| Target is `*.test.sankuai.com`, SSO redirects to `ssosv.it.test.sankuai.com`, or PROD→TEST token exchange (`--cross-env-*`) | [references/cross-env.md](references/cross-env.md) |
