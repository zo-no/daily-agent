# Research: Meituan Internal Log Note

## Evidence hierarchy

The primary implementation reference is the Hackathon practice article
[用 CatPaw 部署 Web 应用](https://km.sankuai.com/collabpage/2761294276). The article's practical
sequence is used as the main line: deploy the existing Web application with CatPaw CloudNative,
move its database dependency to Meituan's hosted Supabase-compatible service, and verify the smallest
usable path before enabling optional capabilities.

Official CatPaw, AIBase, Auth/RLS, and SSO documents are secondary verification sources. They are
used to check supported runtime, identity claims, access control, callback, and operational limits;
they do not replace the Hackathon article as the organizing reference.

The article body could not be fetched again in the current pass because the local approval layer
rejected the authenticated Citadel read. Decisions below use the article title/ID and the Citadel
summary already obtained in this task. No unpublished body text is copied into the repository.

## Decision 1: Follow the Hackathon CatPaw CloudNative path

**Decision**: Deploy the integrated Next.js service as one CatPaw CloudNative application with the
existing install, build, start, and first-port contract.

**Rationale**: This matches the Hackathon practice and preserves the current integrated Web/report
service. It avoids splitting frontend and backend or introducing an Appkey-bound service only for a
first internal release.

**Alternatives considered**:

- Shared frontend/backend Appkeys: deferred because the documented shared-resource flow adds branch
  and ownership assumptions not needed by the existing integrated application.
- Tencent Cloud: remains the later public-release path but does not satisfy internal-first identity
  and data requirements.
- CatPaw Agent products: rejected because they host agent runtimes rather than this Web application.

## Decision 2: Use AIBase as the internal account and text-data boundary

**Decision**: Create a new Meituan-hosted AIBase/Supabase-compatible workspace for the internal
distribution. Do not point the internal build at the existing public Supabase project.

**Rationale**: The Hackathon practice recommends Meituan's hosted Supabase option for applications
that need a database. The current browser client, table reads, and RPC writes already follow
Supabase-compatible contracts, so a new empty internal workspace is the narrowest migration.

**Alternatives considered**:

- Keep the public Supabase project behind an internal Web URL: rejected because authentication and
  note synchronization would still leave the requested internal boundary.
- Copy existing personal records into AIBase: excluded from the first release; only schema and
  synthetic acceptance data enter the new workspace.
- Add a new custom backend/database abstraction: deferred unless AIBase fails the required
  Supabase-compatible Auth, PostgREST, or RPC contracts.

## Decision 3: Make Meituan SSO the only internal account entry

**Decision**: Add a distribution mode in which the account gate offers one Meituan sign-in action.
Email registration/password login, Google sign-in, and Google Calendar are hidden in this mode.

**Rationale**: Employees should not create a separate pilot password to use an internal service.
The existing PKCE callback is provider-neutral and can be reused when the internal provider follows
the standard Supabase OAuth code exchange.

**Alternatives considered**:

- Email/password test accounts: rejected as the primary path because they do not provide normal
  employee access or a company identity boundary.
- Add Meituan SSO beside all existing providers: rejected for the internal build because it leaves
  ambiguous and unapproved entry paths visible.
- Replace public-distribution auth globally: rejected; the internal mode remains removable and the
  default product contract stays available for the later public release.

## Decision 4: Treat stable owner compatibility as a hard gate

**Decision**: Reuse the existing UUID owner, auth.users foreign key, auth.uid() access rules, local
cache namespace, and CAS function only if a real Meituan SSO session proves all of the following:

- session.user.id is a stable UUID;
- the user exists in auth.users;
- the authenticated database role can use PostgREST and the save RPC;
- server-side getUser accepts the access token;
- the same employee resolves to the same UUID on a later session;
- different employees resolve to different owners.

**Rationale**: Current database and local ownership are built around a stable UUID. Internal SSO
documentation also exposes MIS/employee claims for policy use, but claim availability alone does not
prove compatibility with the current UUID foreign key and auth.uid() contract.

**Incompatible branch**: If any condition fails, stop before schema deployment and code promotion.
Create a separate owner-model plan using a reviewed UUID-to-company-identity mapping or a claim-owned
schema. Never cast MIS/employee text to UUID, use email as owner, or create a shared fallback account.

## Decision 5: Reuse schema, RLS, and CAS only on the compatible branch

**Decision**: On a proven standard UUID session, apply the two existing schema migrations to the new
empty AIBase workspace and run anonymous-denial, two-identity RLS, first-save, idempotency, and stale
revision tests.

**Rationale**: The current migrations already provide one document per auth.uid(), forced row-level
security, authenticated-only reads, revision history, operation idempotency, and compare-and-swap.
Reusing them avoids changing the backup or local-first document contract.

**Alternatives considered**:

- Change RLS immediately to sso_mis or sso_emp_id: deferred because the exact claim location and
  stability must be observed, and storing employee identifiers is unnecessary if auth.uid() works.
- Disable RLS for a pilot: rejected because a reachable internal service still requires account
  isolation.

## Decision 6: Keep CatPaw configuration non-secret and build-time explicit

**Decision**: Keep Node 20, npm ci, npm run build, npm start, and port 3100 in the existing manifest.
Supply the AIBase URL, public publishable/anon key, and internal auth-mode flag through an approved
CatPaw build control. Do not place values in Git or deployment YAML.

**Rationale**: Browser-public Supabase configuration is required during the Next.js build even though
it is not a privileged server credential. CatPaw's actual build-variable UI and rollback controls
must be observed rather than inferred from another product's documentation.

**Alternatives considered**:

- Commit a production environment file: rejected because it creates an uncontrolled configuration
  copy and conflicts with the repository boundary.
- Put a service-role or SSO client secret in a public environment variable: rejected; privileged
  values must remain inside the relevant control plane and never enter the browser bundle.

## Decision 7: Keep optional outbound integrations off

**Decision**: Do not supply the existing remote-AI key or Google Calendar client configuration in the
first internal release. Use existing deterministic local fallbacks for optional Agent analysis.

**Rationale**: The first release is about internal reachability, employee identity, account isolation,
the recording loop, offline use, and recovery. FRIDAY/LongCat migration, field approval, retention,
cost, and secret storage remain separate product/security work.

## Decision 8: Release from a clean, traceable source

**Decision**: Build and deploy only one reviewed pushed revision from a clean checkout; retain the
fixed process-readiness route, redacted log review, and known-good redeploy/rollback evidence.

**Rationale**: The main checkout contains extensive user-owned and generated changes. A clean source
prevents private/research/output state from entering CatPaw and maps the running URL to one revision.

## Control-plane facts still requiring real observation

- The AIBase workspace creation and branch controls available to the authorized user.
- The exact internal provider identifier and callback/SSO application configuration.
- Whether a real Meituan SSO login satisfies every stable-owner compatibility condition.
- Whether the existing migrations, forced RLS, PostgREST reads, and security-definer RPC are accepted.
- CatPaw's approved build-variable control, package-source access, HTTPS URL, service logs, and safe
  prior-version/redeploy or rollback control.

These are explicit user/control-plane steps and deployment stop conditions. They are not permission
to paste credentials into chat, source, task artifacts, screenshots, or logs.

## Decision 9: Keep CatPaw, but isolate its private dependency graph

**Decision**: Preserve both CatPaw manifests, the Cargo start path, and the OCTO registration worker.
Move `@mtfe/hlb` into an `ops/catpaw` package with its own lockfile and explicitly install it only in
the CatPaw build commands.

**Rationale**: GitHub runners cannot resolve the Meituan-only package, and the current root lockfile
therefore fails before the quality gate. The dependency is deployment-only and has no consumer in
the public application runtime.

**Alternatives considered**:

- Delete CatPaw: rejected by the user and unnecessary.
- Let GitHub use the Meituan registry: rejected because it would couple a public build to a private
  network and credential boundary.
- Make the private dependency optional in the root package: rejected because npm still resolves
  optional dependencies into the root lockfile during a clean install.

## Decision 10: Build once in GitHub and deploy an immutable standalone artifact

**Decision**: A successful `master` quality job builds Next.js standalone output on GitHub with Node 22,
packages traced runtime files plus static/public assets and exact-revision metadata, and sends only
that checksum-bound archive to the personal Tencent CVM.

**Rationale**: The current on-server release consumes hundreds of megabytes for source, build output,
and a full dependency tree. Standalone output avoids a second install/build, shortens the critical
deployment window, and makes the running release directly attributable to the GitHub revision.

**Alternatives considered**:

- Self-hosted GitHub runner on the production CVM: rejected because untrusted build execution would
  share the production trust boundary and a runner service would add persistent attack surface.
- SSH to pull and build the repository: rejected because it repeats dependency installation and
  compilation on the live server and makes rollback depend on local checkout state.
- Containerize the existing host: deferred because the server already has a restricted systemd and
  Nginx layout; an immutable standalone directory supplies the needed release boundary with less
  operational change.

## Decision 11: Serialize production activation and roll back automatically

**Decision**: Quality runs can cancel obsolete same-ref checks, but production deploy jobs share one
non-cancelling concurrency group. The CVM uses a root-owned fixed deploy control, a restricted runtime
user, atomic symlink replacement, loopback readiness polling, and exact-prior-target rollback.

**Rationale**: Cancelling during activation can strand the server between restart and verification.
A fixed command is narrower than unrestricted root SSH, and atomic links keep the prior release
available without copying or modifying it.

**Alternatives considered**:

- Allow concurrent deploys: rejected because their symlink, restart, and rollback decisions race.
- Delete old releases automatically: deferred; the user asked to avoid deletion and current capacity
  permits retention. Cleanup remains a separate explicit operation.
- Use only a remote public health check: rejected because DNS/TLS are separate prerequisites and the
  service must first prove loopback readiness without exposing port 3100.
