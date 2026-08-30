# Contract: Internal Distribution

## Build mode

- Standard remains the default authentication mode when no distribution value is supplied.
- The internal build uses exactly one allowlisted value: meituan-sso.
- Unknown values fall back to standard behavior during development and fail the internal deployment
  contract; they never enable a broader or privileged mode.
- The auth-mode flag and AIBase browser URL/publishable key are supplied at build time.
- SSO client secrets, administrative database credentials, and service-role keys are never
  client-readable build values.

## Signed-out account gate

In meituan-sso mode the account gate contains:

- Log Note identity and language switch;
- one concise explanation that the employee will use a company identity;
- one Meituan sign-in action;
- loading, unavailable, redirecting, denied, and callback-error states;
- no email input, password input, registration tab, Google sign-in action, or Calendar connection.

The sign-in action has an accessible name, visible keyboard focus, and the existing minimum touch
target. It starts the provider confirmed by AIBase and sends the exact current-origin callback.

## Callback and session

- The existing /auth/callback exchanges an OAuth code using PKCE.
- Missing code, provider error, denied access, or exchange failure shows a safe error and a route
  back to the account gate.
- A session becomes signed-in only when user.id exists.
- On the compatible branch, user.id is the sole account/cache/database owner.
- MIS, employee number, email, and display metadata never replace user.id as storage owner.

## Signed-in account surface

- Home, recording, browse/search/edit/delete, backup, and offline interactions are unchanged.
- Account settings may show a safe display name/subtitle, cloud status, backup boundary, conflict
  recovery, and sign-out.
- Google Calendar settings are absent in the internal mode.
- Remote Agent routes have no production key and continue using their local fallback.

## Data and access acceptance

The internal distribution is not usable until real sessions prove:

- repeat sign-in maps one employee to one stable UUID owner;
- two employees map to distinct owners;
- anonymous read and RPC execution are denied;
- each employee can read/write only their own row;
- first save, retry, and stale-revision refusal match the existing CAS contract;
- server-side token verification accepts the internal access token.

Failure blocks release promotion and returns the feature to owner-model planning.
