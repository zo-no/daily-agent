# GitHub → personal Tencent CVM deployment

This path deploys the standard public distribution to the owner's CVM. CatPaw remains a separate
internal deployment path: GitHub does not install `ops/catpaw`, call a CatPaw manifest, or access the
Meituan npm registry.

## What happens on every push

- Pull requests and pushes run the complete quality job.
- Browser evidence is written to the GitHub runner's temporary directory.
- Only a successful push to GitHub `master` continues to `deploy-tencent`.
- Production jobs are serialized and are not cancelled halfway through activation.
- GitHub builds a Next.js standalone archive once. The CVM does not install dependencies or build
  source during routine deployment.

## One-time GitHub setup

Create a GitHub environment named `production`. If the repository plan supports deployment
protection rules, require a reviewer for this environment.

Add these environment values without printing them in an issue, workflow log, or source file:

| Name | GitHub field | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | variable | Public HTTPS Supabase project URL embedded at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | secret | Browser publishable/anon value embedded at build time |
| `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID` | variable, optional | Public OAuth client ID for the production origin |
| `TENCENT_HOST` | secret | CVM hostname or IP |
| `TENCENT_SSH_USER` | secret | Dedicated restricted deploy account, normally `lognote-deploy` |
| `TENCENT_SSH_PRIVATE_KEY` | secret | Private key used only by the deploy job |
| `TENCENT_SSH_KNOWN_HOSTS` | secret | Pinned OpenSSH host-key line obtained through an authenticated channel |
| `TENCENT_SSH_PORT` | variable, optional | SSH port; defaults to `22` |

The workflow intentionally does not run `ssh-keyscan`; a deployment stops if the pinned host key
does not match.

## One-time CVM bootstrap

Perform bootstrap from an already trusted administrator session. Do not put the deploy account's
private key on the server.

1. Keep the existing restricted runtime account `lognote` and dedicated Node 22 runtime under
   `/opt/log-note/runtime/node`.
2. Create a dedicated login account `lognote-deploy` with only its deployment public key in
   `~lognote-deploy/.ssh/authorized_keys`.
3. Create `/opt/log-note/incoming` owned by `lognote-deploy`, and keep `/opt/log-note/releases`,
   `/opt/log-note/current`, `/opt/log-note/shared`, and the runtime owned by root or `lognote` as
   appropriate. Do not grant the deploy account write access to releases, service files, or runtime
   configuration.
4. Install reviewed repository files as root:

   ```bash
   install -o root -g root -m 0755 ops/start-tencent-server.sh /usr/local/sbin/log-note-start
   install -o root -g root -m 0755 ops/deploy-tencent-release.sh /usr/local/sbin/log-note-deploy
   install -o root -g root -m 0440 ops/sudoers/log-note-deploy /etc/sudoers.d/log-note-deploy
   visudo -cf /etc/sudoers.d/log-note-deploy
   install -o root -g root -m 0644 ops/systemd/log-note.service /etc/systemd/system/log-note.service
   systemctl daemon-reload
   ```

   The root-owned launcher normally executes standalone `server.js`. It retains one compatibility
   branch for the exact pre-CI/CD `next start` release, so the first migration can also roll back.

5. Keep server-only runtime values in `/opt/log-note/shared/.env.production`, owned by root with mode
   `600`. `NEXT_PUBLIC_*` values belong to the GitHub build environment, not this file.
6. Keep port `3100` bound to loopback. The existing Nginx virtual host remains the only public entry;
   routine deployment does not edit Nginx, DNS, ICP, TLS, or the firewall.

The sudoers rule permits one fixed root-owned command. The deploy script independently rejects an
unexpected upload path, malformed revision, wrong digest, unsafe archive path, or incomplete release.

## Routine release and rollback

After an authorized revision reaches GitHub `master`, the workflow:

1. waits for the full quality job;
2. validates required production inputs;
3. builds `log-note-<40-character-sha>.tar.gz` and its SHA-256 digest;
4. uploads the archive into `/opt/log-note/incoming`;
5. invokes the fixed deploy control;
6. extracts a new immutable directory under `/opt/log-note/releases/<sha>`;
7. atomically switches `/opt/log-note/current`, restarts `log-note`, and checks the exact loopback
   `/api/healthz` response.

If the new process does not become ready, the control switches back to the exact prior symlink target,
restarts it, and returns failure to GitHub. A later push can retry the same task after the cause is
fixed. Routine deployment does not delete old releases or incoming archives, run database migrations,
modify Nginx, or touch CatPaw. Storage cleanup is a separate, explicitly authorized maintenance task.

## Verification boundary

Repository tests can prove the dependency split, workflow trigger, artifact shape, validation logic,
service command, and rollback branch. CI/CD is operational only after all of the following are observed
in the real systems:

- one clean GitHub quality run and standalone build on the exact `master` revision;
- the production environment and pinned host identity are accepted without value disclosure;
- `/opt/log-note/current` resolves to that revision and `log-note.service` is active;
- loopback readiness returns `{"status":"ok","service":"log-note"}`;
- a controlled unhealthy-candidate rehearsal restores the previous target;
- the public HTTPS origin and real account flows pass their separate acceptance checks.
