# Contract: GitHub to Personal Tencent CVM

## Source and trigger

- Pull requests and pushes run the complete public quality gate.
- Only a successful push to `refs/heads/main` can run the production deployment job.
- The deployment uses the GitHub `production` environment and read-only repository permission.
- Quality jobs may cancel older checks for the same ref. Production deployments are serialized and
  are never cancelled in progress.

## Dependency boundary

- Root `package.json` and `package-lock.json` contain only public-installable dependencies and zero
  Meituan registry URLs.
- `@mtfe/hlb` exists only in `ops/catpaw/package.json` and its CatPaw-only lockfile.
- CatPaw installs the root dependency graph and the isolated private package explicitly. GitHub never
  installs the CatPaw-only package or invokes a CatPaw deployment file.

## Build artifact

- GitHub uses Node 22 and the exact checked-out revision.
- Required public browser configuration is validated before the build and is supplied by the
  protected environment, with `NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=standard` for the public release.
- The build produces a Next.js standalone tree containing `server.js`, `.next/static`, `public`, and
  a release metadata file with the exact 40-character revision.
- One gzip tar archive and its SHA-256 digest are uploaded. No dependency installation or build is
  repeated on the CVM.

## Transport and activation

- SSH uses a dedicated deploy identity and a pinned `known_hosts` entry; host-key discovery is not
  performed during a deployment.
- The uploaded filename and deploy arguments are derived from the 40-character GitHub revision.
- The root-owned deploy control accepts only `/opt/log-note/incoming/log-note-<sha>.tar.gz`, validates
  the supplied digest, rejects unsafe archive paths or a mismatched metadata revision, and never logs
  configuration values.
- A new release is extracted under `/opt/log-note/releases/<sha>`, owned by the restricted runtime
  user, and `/opt/log-note/current` is replaced atomically.
- `log-note.service` runs a fixed root-owned launcher on `127.0.0.1:3100`; the launcher executes the
  standalone `server.js` and retains a bounded `next start` fallback only for the exact pre-CI/CD
  rollback target. Server-only values come from `/opt/log-note/shared/.env.production`.

## Readiness and rollback

- After restart, the deploy control polls `http://127.0.0.1:3100/api/healthz` for the fixed response.
- Success leaves the new immutable release active. The routine path deletes no old release.
- Failure restores the exact prior symlink target, restarts the service, verifies prior readiness,
  and exits non-zero. Before a first release, failure leaves no candidate described as healthy.
- The deploy control never runs database migrations, modifies Nginx, opens port 3100, triggers
  CatPaw, deletes releases, or rewrites source history.
