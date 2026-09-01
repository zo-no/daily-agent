# Quickstart: Meituan Internal Log Note

This guide separates local repository work from the control-plane actions that require an authorized
employee. Do not paste keys, tokens, SSO secrets, employee identifiers, or note content into chat or
project evidence.

## 1. Repository preflight

1. Confirm .specify/feature.json points to specs/006-internal-pilot.
2. Confirm the spec, plan, research, contracts, checklist, and tasks describe AIBase and Meituan SSO,
   not the obsolete public-Supabase/email-password pilot.
3. Review the dirty tree and explicit write set; preserve unrelated user-owned changes.
4. Run focused specification/deployment checks before application edits.

## 2. User action: open the AIBase control plane

1. On the company network, open [AIBase Workspace](https://aibase.mws.sankuai.com/workspace).
2. Confirm the page is accessible. Do not create a duplicate workspace if a suitable Log Note
   workspace already exists.
3. Tell Codex only that the page is open or whether access is blocked. Do not paste any credential.

Codex will then give the exact next click/field request. Workspace creation, access approval, SSO
resource creation, and secret-bearing configuration remain user-authorized control-plane actions.

## 3. AIBase workspace and identity compatibility

1. Create/select one empty Log Note workspace and branch.
2. Record the public API URL and publishable/anon key only inside an untracked local environment or
   approved platform field.
3. Enable/configure built-in Meituan SSO and register the local callback for the probe.
4. Run the app locally in meituan-sso mode and complete one company sign-in.
5. Record only boolean/type compatibility results from data-model.md:
   UUID owner, auth.users row, authenticated role, server token verification, repeat-session
   stability, and available approved claim names. Do not copy values.
6. If any stable-owner check fails, stop. Do not apply migrations or invent an owner conversion.

## 4. Empty-workspace schema acceptance

Only after compatibility passes:

1. Apply the two existing Supabase migrations in their current order to the empty AIBase branch.
2. Confirm anonymous reads and save RPC calls are denied.
3. With one employee test session, verify first save, idempotent retry, refresh/read, and revision
   increment.
4. With a second employee test session, verify isolation in both directions.
5. With the first employee on a second device, verify a stale revision pauses writes and requires an
   explicit version choice.
6. Use synthetic non-sensitive content only and retain no identifiers or bodies in evidence.

## 5. Internal build implementation and local gate

1. Enable meituan-sso mode and verify the signed-out gate contains one company action and no
   password/Google controls.
2. Verify Account settings omits Google Calendar in internal mode.
3. Verify default mode retains the existing public-distribution controls.
4. Keep the remote-AI and Google configuration absent.
5. Run focused auth/deployment tests, then npm run check.

## 6. Clean CatPaw release

1. Review and stage only the explicit release paths; exclude environment, private, research, review,
   and generated output paths.
2. Commit/push only the authorized release set and record its exact revision.
3. Clone that revision into a fresh temporary directory and confirm a clean status.
4. Open the clean clone in CatPaw and review the existing CloudNative manifest: Node 20, npm ci,
   npm run build, project root, npm start, port 3100.
5. Verify an approved CatPaw build-variable control before entering the AIBase browser-public values
   and meituan-sso mode. If absent, stop rather than writing values into Git/YAML.
6. Deploy, record the internal HTTPS URL/revision, and register the exact production callback.

## 7. Real internal acceptance

With synthetic data:

1. Verify root and /api/healthz over HTTPS.
2. Complete company sign-in, sign-out, and repeat sign-in to the same owner.
3. Complete create, refresh, browse, search, edit/delete, and backup.
4. Complete two-identity isolation in both directions.
5. Complete two-device stale-revision handling.
6. After one authenticated load, disconnect and complete the supported offline loop; reconnect.
7. Run the same-origin report verifier and record only status/header/byte-length results.
8. Review the latest build/service logs for sensitive material without copying any detected value.
9. Verify the known-good redeploy/rollback control.

The release remains unavailable if any identity, isolation, CAS, configuration, HTTPS, logging,
offline, report, source-revision, or recovery check fails. Real personal notes and remote AI remain
blocked after a process-only success.

## 8. GitHub to personal Tencent CVM

1. Keep CatPaw files versioned. Confirm the root package and lockfile have no `@mtfe/hlb` or Meituan
   registry URL, while `ops/catpaw/package-lock.json` retains the private dependency for CatPaw only.
2. Create a GitHub `production` environment. Configure the public build values, deploy host/user,
   private key, and pinned known-host entry there; do not paste their values into source or logs.
3. Bootstrap the CVM once with the restricted runtime/deploy users, fixed root-owned deploy control,
   standalone systemd unit, `/opt/log-note/incoming`, `/opt/log-note/releases`, and the existing
   server-only `/opt/log-note/shared/.env.production`.
4. Open a pull request or push a non-main branch and confirm only the quality job runs. Its browser
   output must use the runner temporary directory.
5. Push an explicitly authorized reviewed revision to GitHub `main`. Confirm quality passes before
   the production job starts, then record the run URL and exact 40-character revision.
6. On the CVM, verify `current` resolves to `/opt/log-note/releases/<sha>`, `log-note.service` is
   active, and loopback `/api/healthz` returns the fixed response. Review redacted logs.
7. Before calling recovery verified, deploy a controlled unhealthy fixture or use the documented
   rehearsal mode and confirm the exact previous target is restored. Do not delete releases or run a
   database migration as part of this test.
