# Production deployment assets

These files support the manual Tencent Cloud deployment described in
`docs/2026-08-17-LN-037-腾讯云上线实施计划.md`.

- `systemd/log-note.service` runs the app as the restricted `lognote` user on `127.0.0.1:3100`.
- `nginx/log-note.conf.template` is pinned to the confirmed production domain `note.kual-shown.online` and is installed only after DNS/ICP prerequisites are satisfied.

The production environment file lives at `/opt/log-note/shared/.env.production` with mode `600` and is never committed. Public `NEXT_PUBLIC_*` values must be present before `npm run build`, because Next.js embeds them into the browser bundle at build time.

Do not enable the systemd unit before `/opt/log-note/current` points to a successfully built release. Do not install the Nginx template before DNS/ICP prerequisites are satisfied.
