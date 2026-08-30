# Authentication Strategies (auth-mode / cookie-source / browser / CDP)

Load this when the default `auto` chain is not enough: managed/headless runtimes, forcing a specific
provider family, selecting a browser profile, or attaching to an existing CDP session.

Start with `mtcurl --explain-auth '<internal-url>'` when the correct client id, environment, provider chain, or cookie
source is unclear. The report contains no raw token or cookie values. It does not send the business request, read
credentials, or persist AppConfig. For an unknown internal app it may make one unauthenticated base-origin request and
inspect only a trusted SSO redirect to discover `client_id`, environment, and callback path.

## Choose the Smallest Policy

| Runtime or intent | Recommended flags | Exact behavior |
|---|---|---|
| Normal local use | no SSO strategy flags | `auto`: env exchange, local OIDC, then browser-cookie compatibility |
| Managed runtime with injected identity | `--auth-mode env --non-interactive` | Environment/platform exchange only; no local OIDC or browser fallback |
| Local OIDC only | `--auth-mode local-oidc` | Local OIDC exchange only; it may be interactive unless `--non-interactive` is also set |
| Existing headless CDP session | `--auth-mode browser-cookie --cookie-source cdp --cdp-url <endpoint> --non-interactive` | CDP only; direct cookie read is allowed, browser launch/navigation/manual login are forbidden |
| Specific local browser profile | `--auth-mode browser-cookie --cookie-source browser-db --browser <name> --browser-profile <profile>` | Browser cookie database only; CDP is never probed or navigated |

## Request-Scoped Strategy Flags

| Flag | Meaning |
|---|---|
| `--auth-mode auto\|env\|local-oidc\|browser-cookie` | Select the provider family. `browser-cookie` is required when CDP or a browser database must be the only family. |
| `--cookie-source auto\|cdp\|browser-db` | Select the source inside the browser-cookie family. It does not select the provider family by itself. |
| `--non-interactive` | Permit passive env, secure-store, browser-database, and connected-CDP reads; forbid browser launch, CDP navigation, and manual login waits. |
| `--no-token-cache` | Bypass the recently validated app-cookie fast path and OIDC audience-token cache. In `auto` source mode, validated secure-storage fallback is still allowed. |
| `--auth-max-wait <seconds>` | Bound interactive browser/CDP login waiting. This has no effect on ordinary request timeout `-m`. |
| `--explain-auth` | Print the effective secret-free plan and stop before the business request. |
| `--skip-sso` | Disable all SSO behavior; it cannot be combined with any SSO strategy, browser/CDP, or AppConfig option. |

## Browser / Profile / CDP Selection

These options affect only the current `mtcurl` process and do not write the active Meituan local configuration file.

| Flag | Purpose |
|---|---|
| `--browser <name>` / `--sso-browser <name>` | Select browser type for cookie lookup, e.g. `chrome`, `edge`, `firefox`, `arc`, `tab`, `tabbit`. |
| `--browser-profile <name>` / `--profile <name>` | Select browser profile directory name, e.g. `Default` or `Profile 1`; common browser roots are inferred when possible. |
| `--browser-profile-dir <dir>` / `--profile-dir <dir>` | Select browser user-data root when inference is insufficient, e.g. `~/Library/Application Support/Google/Chrome`. |
| `--cdp-url <url>` / `--browser-cdp-url <url>` | Select an HTTP(S) or WebSocket CDP endpoint. Add `--auth-mode browser-cookie --cookie-source cdp` to make it strict. This is not limited to CatClaw. |

Examples:

```bash
mtcurl --auth-mode browser-cookie --cookie-source browser-db \
  --browser chrome --browser-profile "Profile 1" '<internal-url>'
mtcurl --auth-mode browser-cookie --cookie-source cdp \
  --cdp-url http://127.0.0.1:9222 --non-interactive '<internal-url>'
mtcurl --auth-mode browser-cookie --cookie-source cdp \
  --browser-cdp-url ws://127.0.0.1:9222/devtools/browser/<id> --non-interactive '<internal-url>'
```

An explicitly connected CDP endpoint may be read in non-interactive environments. `--non-interactive` still prevents
starting a browser, navigating to a login page, or waiting for manual login. The CDP endpoint selects an already-running
browser session; `--browser-profile` does not switch profiles inside that attached session. CDP endpoint credentials,
query parameters, and fragments are never printed in reports or failure diagnostics.

Wrong/logged-out profile fails fast with `Strict browser database lookup did not yield <cookie> for <client_id>`;
`--cookie-source auto` may report `Unable to get cookies ... Please login in browser`. Pick the profile that holds
the live login (try `--browser-profile "Default"` / `"Profile 1"`, or `--browser-profile-dir`).

## Important Semantics

- `--cdp-url` only selects an endpoint. It does not force CDP and does not suppress env/local-OIDC providers.
- Strict CDP is the three-part intent `--auth-mode browser-cookie --cookie-source cdp --cdp-url <endpoint>`.
- `--non-interactive` still allows direct reads from an already connected CDP endpoint. It never allows CDP navigation.
- Strict `cdp` and `browser-db` bypass reusable app-cookie storage so the requested source is actually exercised.
- Use `--explain-auth` before guessing or automatically trying several client ids. Prefer trusted redirect discovery.

## Rejected Combinations

The CLI rejects ambiguous combinations before making a request:

- `--skip-sso` plus any SSO-only option.
- `--test-env` plus `--sso-env` other than `test`.
- `--cookie-source browser-db` plus `--cdp-url`.
- Strict CDP with an attached `--cdp-url` plus `--browser`/profile selection; an attached session's profile cannot be switched.
- `--auth-mode env` or `local-oidc` plus browser/CDP source options.
- `--auth-mode browser-cookie` plus cross-environment exchange options.

## Desktop Browser Preference

Optional default browser (`~/.meituan_local_config.json`):

```json
{
  "sso": {
    "default_browser": "chrome"
  }
}
```

Request-scoped `--browser` / `--browser-profile` override this default for one request.
