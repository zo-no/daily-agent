# AppConfig: One-Shot Overrides, JSON Files, Auto Discovery, and Caching

Load this when a request needs an explicit AppConfig target (`--client-id`, custom cookie name, `--app-config` JSON),
when auto-discovery fails or registers the wrong entry, or when `~/.meituan_sso_apps.json` needs manual repair.

Do not handle raw credential values. AppConfig discovery is implemented by the shared `mt-sso-requests` layer: both
direct `MeituanRequests()` calls and `mtcurl` can discover a standard internal AppConfig from an unauthenticated SSO
redirect and register it after trusted authentication and the business request succeed. `mtcurl` adds only CLI
overrides and output behavior.

## One-Shot Override Flags

| Flag | Purpose | Default when omitted |
|---|---|---|
| `--client-id <id>` | SSO client_id seed for this request; can be omitted when redirect auto-discovery can find it | auto-discovered for unknown `.sankuai.com` URLs |
| `--sso-base-url <url>` (`--base-url`) | AppConfig `base_url` | request URL origin |
| `--health-check-url <url>` (`--heartbeat-url`) | AppConfig `health_check_url` | `base_url` |
| `--sso-cookie-name <name>` (`--sso-key-name`, `--ssoid-key`, `--ssoid-key-name`) | Primary application SSO cookie name | `<client_id>_ssoid` |
| `--sso-key-alias <name>` (`--ssoid-alias`) | Accepted alternate cookie name; repeatable | none |
| `--sso-callback-uri <path>` | AppConfig callback path | `/sso/callback` |
| `--sso-env auto\|prod\|test` | Resolve or force the SSO environment for this AppConfig | legacy `is_test_env` |
| `--app-config <file>` | Load AppConfig JSON (repeatable; `-` for stdin) | none |

Cross-environment flags (`--test-env`, `--cross-env-exchange`, `--cross-env-source-client-id`) are covered in
[cross-env.md](cross-env.md).

## AppConfig JSON

```bash
mtcurl --app-config apps.json https://demo.sankuai.com/api
cat apps.json | mtcurl --app-config - https://demo.sankuai.com/api
```

`apps.json` example:

```json
{
  "demo": {
    "client_id": "com.example.demo",
    "base_url": "https://demo.sankuai.com",
    "url_patterns": ["demo.sankuai.com"],
    "auth_env": "auto"
  }
}
```

Rules:

- Explicit CLI flags override values from `--app-config`.
- Canonical AppConfig options are `--sso-base-url`, `--health-check-url`, and `--sso-cookie-name`; old names remain aliases.
- CLI uses `--sso-env`; AppConfig JSON still uses the library field `auth_env`.
- `--app-config` JSON may be either a single config object (`{"client_id": ...}`) or a map of named configs (`{"demo": {...}}`); both `snake_case` and `camelCase` keys are accepted.
- When loaded via `--app-config`, the request URL must match an entry in `url_patterns` using one of these forms:
  - `host.sankuai.com` matches that exact hostname only.
  - `.host.sankuai.com` matches subdomains on a label boundary, but not the root hostname.
  - `https://host.sankuai.com/api` matches the exact normalized origin and `/api` path boundary.
  - `^regex` remains an explicit regular-expression escape hatch; invalid regex entries are ignored.
  Hostname text in a query string and lookalike hosts such as `host.sankuai.com.evil.example` never match.

## Auto AppConfig Discovery

Shared request flow for both `MeituanRequests()` and ordinary `mtcurl` calls:

1. Match an explicit, built-in, or previously registered AppConfig.
2. For an unknown `.sankuai.com` URL, probe the normalized base origin without credentials and accept discovery only
   when an approved SSO host redirects with a target `client_id`.
3. If the origin is public but the business request returns a trusted SSO redirect or followed SSO login response,
   recover discovery from that response, use the request path without query parameters as the health check, and retry
   through app authentication.
4. Build a temporary AppConfig and run the normal env/local-OIDC/cross-env/browser provider chain.
5. Register the AppConfig only after the business request succeeds through a cache-authorized non-browser source.
6. If discovery is unavailable or ineligible, fall back to URL-scoped CDP/browser cookies without registering.

Do not probe external domains. URL normalization excludes userinfo and normalizes default ports before creating
`base_url` or `url_patterns`. Ordinary `mtcurl URL` delegates this flow to `MeituanRequests`; CLI options such as
`--health-check-url` and `--client-id` call the same shared discovery policy with explicit overrides.

When a URL needs manual discovery guidance, prefer this sequence:

1. Probe the base URL first. The shared request layer does this automatically and reads only the SSO redirect host plus
   `client_id`.
2. If the base URL does not redirect to SSO, ask the user for an idempotent, low-cost GET endpoint and pass it with
   `--health-check-url`.
3. For TEST SSO targets, follow [cross-env.md](cross-env.md).

Auto-discovery produces only the standard defaults: `<client_id>_ssoid`, `access-token`, base-origin health check, and
`/sso/callback`. Use an explicit AppConfig or CLI overrides when the service has a custom cookie/header, a dedicated
health endpoint, custom login-invalid semantics, or a TEST target whose PROD source client id cannot be inferred.

## Registration and Reuse Rules

- New auto-discovered PROD AppConfigs are registered only when the authenticated request succeeds through a
  non-browser app-auth source such as env exchange, local OIDC, official MTSSO, or validated secure storage. If an
  existing entry with the same `client_id` belongs to a different normalized origin, the PROD entry uses
  `client_id__prod__<host_slug>` instead.
- New TEST AppConfigs are cached under `client_id__test__<host_slug>` so they do not collide with PROD entries that use
  the same `client_id`. TEST configs are cached only when `cross_env_source_client_id` is known and the same request
  succeeds through `cross_env_exchange`; cached TEST entries must use `cross_env_exchange: "always"`. If the PROD source
  client id is unknown or the request only succeeds through CDP/browser cookie fallback, do not cache a TEST AppConfig.
- Existing entries are reused only when `client_id`, environment, and normalized origin match. Different PROD origins
  and PROD/TEST entries with the same `client_id` must remain separate. For a matching entry, the tool keeps current
  fields and only appends new `url_patterns`. If an existing TEST entry is missing cross-env fields, update the
  TEST-scoped JSON entry manually before relying on it.
- A successful browser/CDP fallback proves the current browser has cookies, not that the discovered AppConfig or source
  client id is correct, so browser/CDP success must not write cache.

## Persisted Config File Locations

Auto-discovered configs are persisted and loaded into the in-process registry only after the request succeeds through
the expected authentication source. The file location is:

- Local desktop: `~/.meituan_sso_apps.json`
- CatPaw: `~/.catpaw/meituan_sso_apps.json`
- CatClaw: `~/.openclaw/meituan_local/meituan_sso_apps.json`
- Override: `MEITUAN_SSO_APPS_CONFIG`

## Application-Cookie Cache Semantics

Application-cookie cache entries are separately keyed by auth environment, target `client_id`, cookie name, normalized
origin, and a privacy-safe authenticated-user partition. Legacy `client_id`-only entries are not reused automatically.
If the current user cannot be identified, a newly acquired cookie remains memory-only for that refresh and is not
eligible for the persistent fast path. Cache/config writes use cross-process locking and atomic replacement.
