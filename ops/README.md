# Production deployment assets

These files support the GitHub-driven Tencent Cloud deployment described in
`ops/tencent-github-deployment.md` and the broader rollout plan in
`docs/2026-08-17-LN-037-腾讯云上线实施计划.md`.

- `build-tencent-release.sh` creates the immutable Next.js standalone archive in GitHub.
- `deploy-tencent-release.sh` validates, activates, checks, and rolls back that archive on the CVM.
- `start-tencent-server.sh` launches standalone `server.js` and preserves the exact legacy
  `next start` rollback target during the first CI/CD migration.
- `systemd/log-note.service` runs the fixed root-owned launcher as the restricted `lognote` user on
  `127.0.0.1:3100`.
- `sudoers/log-note-deploy` permits the dedicated SSH account to call only the fixed deploy control.
- `nginx/log-note.conf.template` is pinned to the confirmed production domain `note.kual-shown.online` and is installed only after DNS/ICP prerequisites are satisfied.

The production environment file lives at `/opt/log-note/shared/.env.production` with mode `600` and is never committed. Public `NEXT_PUBLIC_*` values must be present before `npm run build`, because Next.js embeds them into the browser bundle at build time.

CatPaw remains under its existing manifests and `ops/catpaw`; it is not used by the GitHub/Tencent
path. Routine deployment does not delete releases, build on the server, migrate data, or edit Nginx.
