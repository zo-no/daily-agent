# CatPaw internal release runbook

This runbook prepares one synthetic-data Log Note release for Meituan employees. The assigned AppKey
path follows [技术支持](https://km.sankuai.com/collabpage/2778881961),
[Hackathon 共享 Appkey 用户文档](https://km.sankuai.com/collabpage/2721737816), and the linked backend
deployment guidance: build `master` with the AppKey's test template, run the Next.js service through
DevTools/HulkPlus/Cargo, and publish it through Oceanus. The no-AppKey CatPaw CloudNative route in
[用 CatPaw 部署 Web 应用](https://km.sankuai.com/collabpage/2761294276) remains a fallback, not a
parallel release. AIBase remains the Supabase-compatible database and authentication boundary.

The first internal release is SSO-only through the AIBase provider `meituan_sso`. It is not accepted
until the live AIBase identity, RLS, revision-conflict, offline, backup, and rollback checks below have
passed. A reachable CatPaw URL or a green process health check is not product acceptance.

## Release boundary

- Use a new AIBase Workspace and synthetic non-sensitive text only. Do not migrate existing personal
  notes into it during validation.
- Build the internal distribution with `NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=meituan-sso`. The login gate
  must expose only Meituan SSO; email/password registration and Google entry points must not render.
- Use the AIBase Workspace API URL and browser publishable/anon value. Never use a service-role value
  in the browser, Git, CatPaw YAML, screenshots, logs, or chat.
- Keep `DEEPSEEK_API_KEY` and `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID` unset. Remote AI, Google sign-in,
  and Google Calendar are outside the first internal release.
- Keep the existing account-scoped offline cache, complete JSON backup/restore, Markdown export, RLS,
  and revision-checked writes. Raw notes must never be rewritten silently.
- Company claims such as MIS, employee number, email, or display name are presentation metadata only.
  They must never replace the account owner key.

## Non-negotiable identity compatibility gate

The current schema stores `auth.users.id` as the stable UUID owner and enforces access with
`auth.uid() = user_id`. Before applying the existing migrations or entering real data, verify with an
actual `meituan_sso` session that AIBase provides all of the following:

1. `session.user.id` is a stable UUID and the same person receives the same value after sign-out and
   sign-in.
2. The UUID maps to the corresponding `auth.users` row and `getUser()` returns the same user.
3. Authenticated requests use the `authenticated` role and `auth.uid()` equals that UUID.
4. MIS, name, employee number, and email remain metadata; no token or secret is exposed to the app's
   account presentation model.
5. The standard browser session refresh and callback flow work on the final HTTPS origin.

Stop immediately if any item fails. Do not coerce MIS or email into a UUID, weaken RLS, create a
shared account, or modify the owner model during deployment. The internal build also keeps the
recording workspace locked when the returned owner is not a canonical UUID. Return to architecture
design instead.

## 1. Human control-plane check: AIBase

An authorized employee opens <https://aibase.mws.sankuai.com/workspace> on the company network and
creates or selects a new empty validation Workspace. Use the official UI to confirm that:

- a Supabase-compatible API URL and browser publishable/anon value are available;
- `meituan_sso` can be enabled through an approved control;
- SQL migrations, Auth callback URLs, and logs can be managed without exposing secrets;
- the Workspace is approved for the pilot's synthetic data.

Do not paste any URL, key, token, account identifier, or screenshot into this repository or chat.
Record only pass/fail and the non-sensitive Workspace/project label in local release evidence.

## 2. Verify AIBase behavior before CatPaw deployment

Use a temporary approved HTTPS callback or the final CatPaw origin when available. Sign in with one
employee identity and verify the five identity conditions above without recording personal claims.
Only on the compatible branch, apply the checked-in migrations in order:

1. `supabase/migrations/20260816090000_log_note_documents.sql`
2. `supabase/migrations/20260816170000_require_expected_revision.sql`

Then run synthetic checks using two employee identities:

- identity A can create, read, update, and delete only A's document;
- identity B cannot read, update, delete, or replace A's document;
- identity B has an independent document and browser cache;
- a stale `expected_revision` is rejected rather than overwriting the newer payload;
- the app never uses a privileged browser key or bypasses RLS.

Stop immediately on an unexpected UUID, missing `auth.users` mapping, wrong role, RLS bypass, RPC
incompatibility, cross-account visibility, or stale-write overwrite. Do not patch around a failed
control-plane contract in production.

## 3. Prepare a traceable source

1. Pass `npm run check`, `node e2e/run-mobile.mjs --internal-auth`, and the deployment-contract tests.
2. Inspect the complete release diff. Exclude local environment files, `private/`, `research/`,
   `review-*`, generated evidence, credentials, personal records, and unreferenced assets.
3. Commit and push only after the authorized release review. Record the exact commit hash and a
   known-good predecessor.
4. Reproduce from a clean clone in a new temporary directory. Confirm `git status --short` is empty,
   dependencies install from approved sources, and the production build passes.
5. Open only that clean clone in CatPaw IDE. Never upload the dirty main checkout.

## 4. Configure the internal build

Supply these browser-public values through the current approved CatPaw build-value control:

- `NEXT_PUBLIC_SUPABASE_URL=<AIBase Workspace API URL>`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<AIBase browser publishable/anon value>`
- `NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=meituan-sso`

Although the first two values are intended for the browser, do not commit them or place them in
`.catpaw/catpaw_deploy.yaml`. Verify the exact CatPaw build-variable control in the current IDE. If it
does not exist or its scope is unclear, Stop immediately and ask CatPaw support rather than adding a
tracked `.env.production` file.

Leave these unset for the first internal release:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID`

The checked-in `.catpaw/catpaw_deploy.yaml` contains only the reviewed CloudNative contract: Node 20,
`npm ci`, `npm run build`, `npm start`, and port `3100`. Do not invent secret, probe, replica, or
rollback fields that are not confirmed by the current CatPaw control plane.

## 5. Deploy the assigned AppKey and create its internal route

1. Confirm the AppKey release source is the intended personal repository and that the test template
   will build `master`. Keep the exact clean source revision visible and review `manifest.yaml`.
2. Trigger the DevTools build/deploy flow. HulkPlus must build with Node 20 and start through
   `ops/start-cargo.sh` on port 3100.
3. The start script runs `ops/register-cargo-service.cjs` before Next.js. Its isolated worker calls
   the official `@mtfe/hlb` registration with the assigned AppKey and port; Cargo supplies swimlane
   and cell metadata. A ten-second watchdog fails the deployment instead of leaving a hung or
   unregistered candidate. SDK output is suppressed and the parent prints only a fixed result.
4. Confirm OCTO shows a normal HTTP node for the AppKey. Create the Oceanus main domain and route `/`
   to that AppKey. The default OCTO scanner requests `/monitor/alive`; do not substitute application
   readiness for node registration.
5. In Cargo, create or backfill the swimlane domain after the main domain exists. The documented
   naming form is `<swimlane>-sl-<main-domain>`, but record and use only the URL actually returned by
   the control plane.
6. Record only project/deploy ID, exact commit hash, completion status, observed internal HTTPS
   origin, and timestamps. Do not copy full logs, node addresses, or environment values into project
   artifacts.

After CatPaw returns the final HTTPS origin, register these exact values in AIBase Auth:

- site/origin: `<internal-origin>`
- redirect: `<internal-origin>/auth/callback`

Retain approved local-development callbacks. Rebuild if the build-time configuration changed. An
outer gateway does not replace the app's AIBase session, stable UUID owner, RLS, or account-scoped
cache.

## 6. Verify platform and application readiness

Request both `GET <internal-origin>/monitor/alive` and `GET <internal-origin>/api/healthz`. Each has
the same fixed expected response:

```json
{"status":"ok","service":"log-note"}
```

Each must be `200`, JSON, `private, no-store, max-age=0`, and `nosniff`. The first is the OCTO platform
probe and the second is the application deployment probe. Together they prove only that registered
routing reaches the web process. They do not prove AIBase reachability, login, RLS, revision safety,
backup, or offline behavior.

## 7. Run internal acceptance

Use generated text with no real work, health, financial, customer, calendar, identity, or personal
information. Record only pass/fail, timestamps, project/deploy ID, and commit hash.

1. Verify the signed-out page shows one Meituan SSO action and no email/password, registration,
   Google sign-in, or Google Calendar entry point.
2. Complete SSO with employee identity A and confirm the callback returns to the exact internal
   origin with the verified stable UUID owner.
3. Create one ordinary synthetic note; refresh, browse, search, edit, and delete it. Confirm raw text
   is unchanged except for the explicit edit.
4. Export complete JSON and readable Markdown. Validate the downloads locally, then remove the test
   artifacts outside repository evidence.
5. After one authenticated online load, disconnect the network. Browse, search, create, edit, and
   delete synthetic notes; refresh the cached application and verify the supported shell remains
   available. Reconnect and confirm revision-safe synchronization resumes.
6. Repeat the account-isolation checks with employee identity B in a separate browser profile. A's
   records and cache must never appear for B, and B's data must never appear for A.
7. Exercise the two-device stale-revision case and verify it pauses synchronization rather than
   replacing the newer version.
8. Sign out and confirm the business UI returns to the SSO-only gate.

No real personal notes may be entered until the complete acceptance set passes.

## 8. Inspect logs and rehearse recovery

Use CatPaw's current approved log viewer. Inspect build and service logs for environment values,
authorization material, cookies, request bodies, identity claims, note content, or stack traces that
contain them. Record only a sanitized pass/fail result. If sensitive material appears, Stop
immediately, restrict the deployment, and treat the log as sensitive.

Before calling the release recoverable, verify the exact current control for stopping the service and
redeploying the recorded known-good predecessor without altering AIBase data. Rehearse only a clearly
scoped, recoverable action. Do not delete a project, rewrite source history, or guess an undocumented
API.

## Stop conditions

Stop immediately if any of the following occurs:

- the running deployment cannot be mapped to the reviewed commit;
- AIBase identity is not a stable UUID-backed `auth.users` session;
- authenticated role, RLS, RPC, two-identity isolation, or revision conflict behavior differs from
  the verified contract;
- approved build-value, OCTO registration, Oceanus main-domain, Cargo swimlane-domain, callback,
  HTTPS, package, or runtime controls are unavailable;
- a secret, privileged key, remote-AI configuration, real personal data, or shared account is
  requested;
- logs expose environment values, authorization material, identities, request bodies, or records;
- raw-note fidelity, backup/restore, offline use, account isolation, or clean-clone reproduction
  regresses;
- the full quality gate, internal-auth regression, or rollback rehearsal fails.

Record sanitized evidence and blockers in `PROJECT_BOARD.md`. Do not label the release accepted from
a process-only success URL.
