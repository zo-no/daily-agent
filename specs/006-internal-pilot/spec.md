# Feature Specification: Meituan Internal Log Note

**Board Item**: LN-037
**Feature Directory**: 006-internal-pilot
**Created**: 2026-08-28
**Updated**: 2026-08-31
**Status**: Draft
**Input**: User descriptions: "先把服务上到美团内部，主要参考 Hackathon 的文章，并做到员工可以正常使用。" and later "腾讯云是我自己的服务器；保留 CatPaw，不用管它，保证上传 GitHub 可以正常部署。"

> PROJECT_BOARD.md remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove an acceptance claim.

### User Story 1 - Sign in and use the internal service (Priority: P1)

As a Meituan employee, I can open one internal HTTPS address and enter Log Note through my Meituan
identity, so I can use the service without creating or sharing a separate pilot password.

**Why this priority**: An internal page is not usable merely because it renders. A trusted employee
identity, a stable account owner, and a complete callback are the minimum usable entry path.

**Independent Test**: From the company network, an approved employee opens the internal address,
completes Meituan sign-in, reaches the account-owned workspace, signs out, and signs in again to the
same account without seeing email registration, password login, or Google sign-in.

**Acceptance Scenarios**:

1. **Given** an employee with access to the internal pilot, **When** they complete Meituan sign-in,
   **Then** they reach one stable account-owned workspace and a later sign-in resolves to the same
   owner.
2. **Given** denied access, a malformed callback, an unavailable identity service, or an identity
   that cannot be mapped safely to one owner, **When** sign-in is attempted, **Then** the application
   remains at the account gate, creates no shared or guessed owner, and shows a recoverable failure.

---

### User Story 2 - Complete the account-owned core loop (Priority: P1)

As an authenticated employee, I can record, browse, search, edit or delete, export a backup, and use
an already-authenticated device offline, while my synchronized text remains owned by my company
identity inside the approved Meituan data boundary.

**Why this priority**: The internal release must prove the existing recording loop and account
isolation, not only authentication or a static page.

**Independent Test**: Two employee test identities and two devices complete the core-loop, account
isolation, offline, reconnect, and stale-revision scenarios with synthetic non-sensitive content.

**Acceptance Scenarios**:

1. **Given** an authenticated employee and synthetic content, **When** they record, refresh, browse,
   search, edit or delete, and export a backup, **Then** the raw text, backup compatibility, local-first
   behavior, and account ownership match the verified product contract.
2. **Given** a device that authenticated successfully before losing connectivity, **When** the
   employee records, browses, searches, edits, or deletes offline, **Then** those actions remain
   available and reconnect follows the existing revision-conflict rules without silent overwrite.
3. **Given** two different employee identities, **When** each creates and reloads content, **Then**
   neither identity can read, replace, delete, or reuse the other identity's records or local cache.

---

### User Story 3 - Operate a traceable and reversible internal release (Priority: P1)

As the product owner, I can identify the exact release, see a non-sensitive readiness result, review
redacted build and service logs, and return to a known-good release, so the internal service does not
depend on an untraceable developer checkout.

**Why this priority**: Normal internal use requires a reproducible release and a safe stop path as
well as a working user journey.

**Independent Test**: Match the running internal address to one immutable source revision whose full
quality gate passed, inspect readiness and redacted logs, then exercise the documented safe redeploy
or rollback control without migrating or rewriting user data.

**Acceptance Scenarios**:

1. **Given** an approved candidate, **When** it is released, **Then** its internal address, source
   revision, quality result, configuration boundary, and known-good predecessor are recorded without
   credentials, identifiers, or note content.
2. **Given** a failed first candidate or an unhealthy later candidate, **When** promotion is
   considered, **Then** the first remains unavailable or the later candidate returns to the recorded
   known-good release; no failed candidate is described as usable.

---

### User Story 4 - Deploy the public build from GitHub to the owner's Tencent CVM (Priority: P1)

As the server owner, I can push a reviewed revision to GitHub `master` and have GitHub run the complete
quality gate, build one immutable public release, and deploy it to my Tencent CVM without CatPaw or
Meituan's private package registry, so the public runtime follows the source repository reliably.

**Why this priority**: The personal Tencent server is now the selected public runtime. The existing
GitHub gate cannot install its root dependency graph outside Meituan, and manual on-server builds are
large, slow, and harder to reproduce.

**Independent Test**: A clean public-registry install and full gate pass on the exact GitHub revision;
the same revision is packaged as a Next.js standalone artifact, checksum-verified on the CVM, switched
atomically, and returns the fixed readiness response. A deliberately unhealthy candidate returns the
service to the previously running release.

**Acceptance Scenarios**:

1. **Given** a pull request or non-deploying GitHub check, **When** the quality workflow runs, **Then**
   it installs only public root dependencies, writes browser evidence outside tracked paths, and
   performs no SSH or deployment action.
2. **Given** a push to GitHub `master` whose quality job passes, **When** the deployment job runs,
   **Then** it builds once on GitHub, uploads one checksum-bound standalone artifact, switches the
   CVM atomically, and records the exact 40-character source revision.
3. **Given** a failed build, failed checksum, malformed artifact, missing configuration, SSH failure,
   or failed local readiness check, **When** deployment is attempted, **Then** the current release
   remains unchanged or is restored automatically and no database migration or CatPaw action occurs.

### Edge Cases

- The employee is valid but has not been granted access to the internal application or data workspace.
- A sign-in result contains company claims but no stable owner compatible with account isolation.
- The same employee signs in on two devices while one holds a stale document revision.
- Two employee identities share a browser in sequence and cached data survives sign-out.
- The internal address changes after its authentication callback has been registered.
- Required browser configuration is missing, malformed, or replaced with a privileged credential.
- The internal data service, package source, or identity provider is unavailable during build or use.
- Runtime logs, screenshots, deployment metadata, or checked-in files expose tokens, configuration,
  employee identifiers, private records, or internal document bodies.
- An authenticated device loses the network after its application shell and account cache are ready.
- A reviewer tries Google sign-in, Google Calendar, remote AI, or migration of existing external data.
- GitHub cannot reach Meituan's private npm registry or resolve `@mtfe/hlb`.
- Two pushes arrive while a production deployment is running.
- An uploaded archive has the wrong checksum, unsafe path, missing `server.js`, or wrong revision.
- The GitHub build succeeds but required public build-time configuration is absent.
- The new standalone process starts but `/api/healthz` does not become ready before the timeout.

## Product Admission *(mandatory)*

### Core-Loop Contribution

The internal release makes the existing quick record → browse → search → edit/delete →
backup/restore → offline use loop reachable to approved employees without reproducing a developer
machine. It does not add a new required recording decision.

### User Evidence

The product owner explicitly requested an internal-first release, supplied the Hackathon support
material, and asked that the service be usable normally inside Meituan. The current local-only flow
prevents colleagues from using or reviewing the product, while the earlier external-account pilot
would not meet the requested internal identity and data boundary.

### Default Interface and Recording Cost

The internal distribution has one company sign-in entry at the existing account gate. Email
registration, password login, Google sign-in, and Google Calendar are absent from this distribution.
After authentication, the home page and ordinary recording flow remain unchanged: opening the
composer takes one action and saving after typing takes one further action.

### Offline, Account, Privacy, Reversibility, and Backup

Text, plans, structure, and settings continue to write to the employee account's isolated local cache
first and synchronize through revision-checked writes. An authenticated device remains usable
offline. Company identity must resolve to one stable owner; an identity that cannot do so blocks the
release rather than falling back to a shared account. Raw notes, JSON backup/restore, readable
Markdown export, and local attachment ownership remain unchanged. The first release uses synthetic
non-sensitive content until two-identity isolation and the approved internal data path are observed
in the real environment.

### Verification and Removability

Regression covers internal sign-in mode, callback handling, stable ownership, disabled alternate
providers, configuration safety, readiness, the full product gate, and deployment contracts. Real
evidence covers two employee identities, two devices, offline/reconnect, stale revisions, the report
endpoint, logs, and rollback. The internal distribution mode, deployment files, and internal workspace
can be removed without rewriting raw notes or changing public-release plans.

### Exit Condition

Keep the release unavailable if company sign-in cannot map safely to one stable owner, two employees
cannot be isolated, the internal data service cannot preserve revision checks, required configuration
cannot be supplied safely, the address or callback is unstable, sensitive logging appears, rollback
cannot be identified, or the complete quality gate regresses. Existing external user data is not
migrated as part of this pilot.

### Admission Decision

- **Score**: 19/20 using the rubric in product.md
- **Decision**: isolated internal release
- **Red-line check**: Admission requires company identity, an approved Meituan-hosted account and
  data boundary, account isolation, offline continuity, raw-note integrity, backup compatibility,
  and a green quality gate. A shared owner, silent identity conversion, external personal-data path,
  or failed gate rejects the release.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The internal release MUST expose one stable HTTPS address reachable by approved
  employees and MUST identify the exact immutable source revision used for the running release.
- **FR-002**: The internal distribution MUST present Meituan sign-in as its only account entry and
  MUST NOT present email registration, password login, Google sign-in, or Calendar connection.
- **FR-003**: A successful company sign-in MUST resolve to one stable account owner across sessions
  and devices; an unverified or incompatible identity MUST NOT create a guessed, shared, or mutable
  owner. MIS, employee number, email, and human-readable names MAY be used for presentation only and
  MUST NOT replace the verified stable owner used by storage, caches, or access rules.
- **FR-004**: Active authentication and synchronized text for the internal distribution MUST stay
  within the approved Meituan-hosted service boundary; it MUST NOT depend on the existing public
  Supabase project.
- **FR-005**: The data service MUST enforce per-owner read and write isolation and preserve
  revision-checked creation, update, conflict pause, and explicit recovery behavior.
- **FR-006**: If the company identity cannot satisfy the existing stable-owner contract, the release
  MUST stop until an explicit owner mapping and migration path passes two-identity and two-device
  acceptance; company usernames MUST NOT be coerced into an incompatible identifier.
- **FR-007**: Required browser configuration MUST be supplied through an approved deployment control;
  privileged credentials and private environment files MUST NOT enter source, deployment metadata,
  screenshots, logs, or client-readable configuration.
- **FR-008**: The exact internal origin and callback MUST be registered before company sign-in is
  declared working; callback failure MUST return safely to the account gate.
- **FR-009**: The running release MUST support record, refresh, browse, search, edit/delete, backup,
  sign-out, and already-authenticated offline use without adding a required recording step.
- **FR-010**: The release MUST provide a readiness response that proves only that the web process is
  serving while revealing no configuration, token, identity, dependency state, or record content.
- **FR-011**: Build and runtime logs MUST exclude request bodies, authorization material,
  configuration values, private records, and employee identifiers.
- **FR-012**: Remote AI, Google sign-in, and Google Calendar MUST remain disabled until separately
  admitted with their own credential, data, fallback, cost, and approval boundaries.
- **FR-013**: A failed first candidate MUST remain unavailable. Every later candidate MUST preserve
  the last verified revision as its recovery target until the new candidate passes.
- **FR-014**: The deployed report endpoint MUST accept one same-origin synthetic request and return
  the expected scoped download and safety headers without logging its request or body.
- **FR-015**: The GitHub root dependency graph and lockfile MUST be installable from the public npm
  registry and MUST NOT reference `@mtfe/hlb` or a Meituan registry. CatPaw's private runtime
  dependency MUST remain in an isolated CatPaw-only package and lockfile.
- **FR-016**: Pull requests and pushes MUST run the complete repository quality gate before any
  deployment. Browser evidence MUST use an untracked temporary directory rather than mutate
  `output/playwright/**`.
- **FR-017**: Only a successful push to GitHub `master` MAY enter the Tencent deployment job. The job
  MUST use the protected `production` environment, read-only repository permission, fixed known-host
  verification, and serialized production concurrency that is never cancelled by a later push.
- **FR-018**: The public release MUST be built once in GitHub as a Next.js standalone artifact. The
  artifact MUST contain the exact source revision, public/static assets, and a SHA-256 checksum, and
  the CVM MUST NOT run `npm install`, `npm ci`, or `next build` during routine deployment.
- **FR-019**: The CVM deploy control MUST reject an unexpected path, revision, checksum, or artifact
  shape; extract into a new release directory; switch `/opt/log-note/current` atomically; restart the
  restricted service; and verify the fixed loopback readiness endpoint.
- **FR-020**: If readiness fails after switching, the deploy control MUST restore the previously
  running release and restart it. It MUST NOT delete releases, rewrite history, run database
  migrations, alter CatPaw, or expose port 3100 publicly.
- **FR-021**: Build-time `NEXT_PUBLIC_*` values MUST come from the GitHub `production` environment;
  server-only values MUST remain in `/opt/log-note/shared/.env.production`. Neither class of value,
  the SSH private key, nor raw host key material may be printed or committed by the workflow.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: The internal release MUST NOT introduce a shared account, silent cross-account data
  adoption, implicit upload path, or unreviewed migration of existing external data.

### Key Entities

- **Employee Identity**: An authenticated company identity and its stable owner mapping. It never
  stores a password in Log Note data or evidence. The verified stable user ID owns storage, caches,
  and access rules; MIS, employee number, email, and names are display metadata only.
- **Internal Account Workspace**: The approved Meituan-hosted identity and synchronized-text boundary
  holding one employee-owned revisioned document.
- **Internal Document**: The existing text payload owned by one stable identity, protected by
  per-owner access rules and revision checks; image blobs remain account-scoped and local.
- **Internal Release**: One immutable source revision plus its quality result, internal address,
  verification status, and optional known-good predecessor.
- **Deployment Configuration**: Non-secret build and runtime instructions plus references to approved
  control-plane values; it never owns credentials or user data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An approved employee reaches the account-owned home page through company sign-in in two
  attempts or fewer and a later sign-in resolves to the same owner.
- **SC-002**: Two employee test identities complete create, refresh, browse, search, edit/delete,
  backup, sign-out, and sign-in with zero cross-account reads, writes, cache reuse, or attachment
  exposure.
- **SC-003**: One employee on two devices completes initial synchronization and one stale-revision
  scenario with zero silent overwrites; the stale device pauses until an explicit version choice.
- **SC-004**: An already-authenticated device completes the supported record, browse, search,
  edit/delete, and backup loop offline, then reconnects without raw-text or ownership regression.
- **SC-005**: Runtime inspection finds zero authentication or note-sync requests leaving the approved
  Meituan service boundary and zero remote-AI requests during the first release.
- **SC-006**: Repository, deployment metadata, build logs, and service logs contain zero credentials,
  authorization values, request bodies, employee identifiers, private records, or internal document
  bodies.
- **SC-007**: Every deployed candidate maps to exactly one pushed revision with a passing full quality
  gate; after the first verified release, the prior known-good revision can be selected for recovery
  within 15 minutes.
- **SC-008**: One same-origin synthetic report request returns the expected date-scoped file, safety
  headers, and exact byte length without its body appearing in reviewed logs.
- **SC-009**: A clean GitHub-hosted `npm ci` completes without contacting a Meituan domain and the
  root lockfile contains zero Meituan registry URLs or CatPaw-only dependencies.
- **SC-010**: A successful GitHub `master` run maps the live loopback readiness response to exactly one
  immutable 40-character revision, while a failed candidate preserves or restores the prior target.
- **SC-011**: Routine Tencent deployment uploads a standalone archive and performs zero dependency
  installation, source checkout, application build, database migration, or release deletion on the
  production CVM.

## Scope Boundaries *(mandatory)*

### In Scope

- One internal distribution of the existing integrated web application and report endpoint.
- Meituan employee sign-in, stable owner mapping, approved internal account and synchronized-text
  workspace, per-owner access rules, revision conflict behavior, and exact callback registration.
- Traceable build/start configuration, readiness, redacted logs, safe first-deploy failure behavior,
  known-good recovery, and synthetic real-environment acceptance.
- A distribution-specific account gate that hides email/password, Google, and Calendar entry without
  changing the public-release product contract.
- A separate GitHub-to-personal-Tencent delivery path for the standard public distribution, including
  public dependency isolation, CI quality gate, immutable standalone build, SSH handoff, atomic
  activation, readiness verification, and automatic rollback.

### Out of Scope

- DNS, ICP filing, certificate issuance, public launch announcement, or a production availability
  commitment. This package makes the already selected CVM deployable but does not claim those
  external prerequisites are complete.
- Migration of existing users or personal records from the current public Supabase project.
- Remote AI enablement, FRIDAY migration, Google sign-in, Google Calendar, remote image storage,
  multi-instance scaling, or shared distributed rate limiting.
- Product redesign, new recording behavior, new required fields, raw-note transformation, or backup
  format changes.

## Assumptions and Dependencies

- LN-037 is the single board item refined by this package; its internal phase does not erase the
  separately planned public release.
- The Hackathon practice article 用 CatPaw 部署 Web 应用 is the primary implementation reference;
  official platform documents are used only to validate identity, data access, configuration,
  security, and operational limits.
- The product owner has authorized preparing a traceable internal release. Creation of workspaces,
  access applications, credentials, callbacks, and final deployment requires explicit control-plane
  actions by an authorized employee.
- The approved internal data service is expected to provide a stable authenticated owner compatible
  with per-owner access and revision checks. This expectation MUST be verified with a real company
  session before schema reuse is accepted.
- The first acceptance uses synthetic non-sensitive content. Real personal notes remain blocked until
  the internal data boundary and two-identity isolation are observed and approved.
- The personal Tencent CVM and its existing `/opt/log-note` release layout are authorized targets for
  this delivery design. Repository changes do not authorize pushing the current working tree,
  changing GitHub secrets, or modifying the live server without the separate control-plane step.
- CatPaw assets remain versioned and operational. They are isolated from, and never invoked by, the
  GitHub-to-Tencent workflow.
- The platform must provide an approved way to supply required browser configuration, a stable HTTPS
  address, redacted logs, and a safe redeploy or rollback control; absence of any one is a stop
  condition rather than permission to hardcode a workaround.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001, FR-007, FR-010, FR-013, SC-007 | Traceable revision, deployment contract test, HTTPS/readiness observation, redacted release and rollback record | Runtime, health, HTTPS, release and recovery evidence |
| FR-002, FR-003, FR-006, FR-008, SC-001 | Internal account-gate regression plus real company sign-in, callback, stable-owner, sign-out/sign-in observation | Authentication and callback readiness |
| FR-004, FR-005, NR-002, NR-005, SC-002–SC-005 | Internal workspace configuration review, two-identity access reversal, two-device conflict, offline/reconnect smoke | Internal data boundary, account isolation, CAS and offline evidence |
| FR-009, NR-001–NR-004 | Full quality gate plus synthetic core-loop and backup smoke | Functional and non-regression evidence |
| FR-011, FR-012, SC-005–SC-006 | Configuration scan, disabled-provider regression, build/service log inspection | Credential, privacy and disabled-integration boundary |
| FR-014, SC-008 | Synthetic live report verification and redacted service-log review | Report API availability and log safety |
| FR-015–FR-018, SC-009, SC-011 | Public lockfile scan, GitHub workflow contract, clean public-registry install, standalone artifact inspection | Reproducible GitHub quality and build evidence |
| FR-019–FR-021, SC-010–SC-011 | Deploy-script contract, checksum/path rejection, atomic switch and rollback rehearsal, loopback readiness | Tencent release and recovery evidence |
