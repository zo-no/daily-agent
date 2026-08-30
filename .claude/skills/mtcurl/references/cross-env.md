# Cross-Environment (PROD → TEST) Authentication

Load this when the target is a `*.test.sankuai.com` host, when an SSO redirect points to
`ssosv.it.test.sankuai.com`, or when a TEST AppConfig needs `cross_env_exchange` fields.

## Flags

| Flag | Purpose | Default |
|---|---|---|
| `--test-env` | Compatibility shortcut for `--sso-env test` | prod |
| `--sso-env auto\|prod\|test` | Resolve or force the SSO environment for this AppConfig | legacy `is_test_env` |
| `--cross-env-exchange auto\|never\|always` | Control PROD→TEST token exchange after TEST SSO is selected | `auto` |
| `--cross-env-source-client-id <id>` | PROD client_id used to obtain the source token before cross-env exchange | target client_id |

`--auth-mode browser-cookie` cannot be combined with cross-environment exchange options.

## Determine the Real SSO Environment First

For test-domain services, do not assume `--test-env` from the hostname alone. First inspect the unauthenticated SSO
redirect for the target health check:

- Redirect to `ssosv.sankuai.com` means PROD SSO. Use `--sso-env prod`; this is the `mws-test.sankuai.com` pattern.
- Redirect to `ssosv.it.test.sankuai.com` means TEST SSO. Prefer PROD→TEST cross-env exchange over direct TEST OIDC
  unless the user explicitly asks to validate direct TEST OIDC.
- If the redirect contains a different `client_id`, use that redirect `client_id` as the target audience. When you still need a PROD source token for a different client id, pass `--cross-env-source-client-id`.

## Inferring the PROD Source client_id for TEST Domains

When a TEST host follows the common `.test.sankuai.com` naming pattern, infer the PROD probe host by removing the
`.test` label before `.sankuai.com`.

Example:

- TEST host: `yunying.waimai.test.sankuai.com`
- Inferred PROD host: `yunying.waimai.sankuai.com`

Use the inferred PROD base URL or an equivalent low-cost PROD GET endpoint to inspect its unauthenticated SSO redirect
and read the PROD `client_id`. Then call the TEST endpoint with:

```bash
# Probe only the SSO redirect Location; do not follow redirects and do not send credentials.
uv run python - <<'PY'
from urllib.parse import parse_qs, urlparse
import requests

url = "http://yunying.waimai.sankuai.com/welcome"
response = requests.get(url, allow_redirects=False, timeout=10, headers={"Accept": "application/json,text/html,*/*"})
location = response.headers.get("Location", "")
print(parse_qs(urlparse(location).query).get("client_id", [""])[0])
PY
```

```bash
mtcurl \
  --sso-env auto \
  --cross-env-exchange always \
  --cross-env-source-client-id <prod_redirect_client_id> \
  --sso-base-url http://yunying.waimai.test.sankuai.com \
  --health-check-url http://yunying.waimai.test.sankuai.com/welcome \
  http://yunying.waimai.test.sankuai.com/welcome
```

If the TEST redirect advertises a target `client_id`, use that as `--client-id`; otherwise allow `mtcurl` to discover it
from the TEST redirect. The PROD inferred `client_id` is the source audience for cross-env exchange, not necessarily the
same as the TEST target audience.

This hostname inference is a heuristic. If the inferred PROD host does not resolve, does not redirect to SSO, or uses a
different production domain, ask the user for the real PROD base URL or a low-cost PROD GET endpoint.

If cross-environment exchange cannot obtain a valid TEST token, the normal auth chain continues to CDP/browser cookies
in auto mode (without registering an AppConfig).

## Cached TEST AppConfig Entries

TEST configs are persisted only when the persisted entry contains a PROD source client id and the request succeeded
through `cross_env_exchange`. The default auto-cache key is `client_id__test__<host_slug>`, where `host_slug` is the
base host with non-alphanumeric characters replaced by `_`.

If an existing TEST entry was cached before the PROD source id was known, edit the TEST-scoped entry and add/fix the
cross-env fields. Do not merge a TEST host into a PROD top-level key just because the `client_id` is the same.

Example of a complete TEST entry:

```json
{
  "test-redirect-client-id__test__yunying_waimai_test_sankuai_com": {
    "client_id": "test-redirect-client-id",
    "base_url": "http://yunying.waimai.test.sankuai.com",
    "health_check_url": "http://yunying.waimai.test.sankuai.com/welcome",
    "auth_env": "auto",
    "is_test_env": true,
    "cross_env_exchange": "always",
    "cross_env_source_client_id": "prod-redirect-client-id",
    "url_patterns": [
      "http://yunying.waimai.test.sankuai.com"
    ]
  }
}
```

General AppConfig matching, registration, and file-location rules are in [appconfig.md](appconfig.md).
