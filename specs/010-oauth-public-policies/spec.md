# Feature Specification: OAuth Public Policies

**Board Item**: `[LN-067]`
**Feature Directory**: `010-oauth-public-policies`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "补齐 Google OAuth 正式发布需要的隐私权政策、服务条款和应用介绍细节。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Understand the app before signing in (Priority: P1)

As a prospective user or OAuth reviewer, I can open a public Log Note introduction and understand
what the product does, why it requests Google Calendar access, and where to read its privacy policy.

**Why this priority**: A truthful, public app identity is the minimum useful release artifact and a
Google OAuth production prerequisite.

**Independent Test**: Open `/about` in a clean browser with no Supabase session and verify that the
page describes Log Note and its Calendar use without showing or depending on the account gate.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they open `/about`, **Then** they see the product name,
   purpose, Calendar feature explanation, support contact, and links to Privacy and Terms.
2. **Given** authentication or Google APIs are unavailable, **When** they open `/about`, **Then** the
   public content remains readable and no sign-in is required.

---

### User Story 2 - Review Google data handling (Priority: P1)

As a user deciding whether to grant Calendar access, I can read a bilingual privacy policy that
accurately explains which account and Calendar data Log Note accesses, how it uses and stores that
data, when it shares data, and how I can disconnect or request deletion.

**Why this priority**: Informed consent and an accurate Google user-data disclosure are prerequisites
for trusting or publishing the optional Calendar integration.

**Independent Test**: Open `/privacy` while signed out and verify every disclosure category against
the current authentication, Calendar scope, sync-window, browser cache, and Supabase data behavior.

**Acceptance Scenarios**:

1. **Given** a visitor on `/privacy`, **When** they review the policy, **Then** they can identify the
   exact Google scope and the access, use, storage, sharing, retention, security, revocation, and
   deletion behavior in Chinese and English.
2. **Given** a user disconnects Google Calendar, **When** they compare the product behavior with the
   policy, **Then** the policy correctly states that the browser token and local Calendar cache are
   cleared while existing Google Calendar events are not deleted.

---

### User Story 3 - Review service terms (Priority: P1)

As a user, I can read public bilingual terms that explain account responsibility, ownership of my
content, acceptable use, third-party dependencies, availability limits, termination, and changes
without implying an unverified company identity or jurisdiction.

**Why this priority**: Production users need a clear agreement boundary, but the project must not
make unsupported legal claims merely to satisfy a console form.

**Independent Test**: Open `/terms` while signed out and confirm the required sections, update date,
support contact, cross-links, and conservative independent-project wording.

**Acceptance Scenarios**:

1. **Given** a signed-out or signed-in visitor, **When** they open `/terms`, **Then** the same current
   terms are readable without an account or Calendar permission.
2. **Given** the project has no declared legal entity or governing jurisdiction, **When** the terms
   render, **Then** they do not invent either and direct legal or account questions to the published
   support contact.

### Edge Cases

- A direct visit or refresh on `/about`, `/privacy`, or `/terms` must not redirect to the account gate.
- The pages remain useful when Supabase, Google Identity Services, or Calendar APIs are unavailable.
- Chinese and English disclosures describe the same data behavior; neither language may omit a
  material Google-data statement.
- Long URLs, scope names, and headings do not create horizontal overflow at 320 px, 390 px, or
  desktop widths; keyboard users receive visible focus and touch targets remain at least 44 px.
- The public pages do not read or expose account-owned local records, Calendar cache, access tokens,
  or cloud payloads.
- External links use safe navigation behavior and all internal policy links resolve.

## Product Admission *(mandatory)*

### Core-Loop Contribution

This does not add a recording feature. It supports account entry and the already-isolated optional
Calendar context around `browse` while preserving the primary `quick record → browse → search →
edit/delete → backup/restore → offline use` loop.

### User Evidence

The user explicitly requested Google Calendar integration and OAuth publication, then encountered
Google's incomplete-branding and origin configuration requirements and asked to complete the privacy
policy and terms details.

### Default Interface and Recording Cost

Three secondary public routes and small legal links are added to the sign-in/account surfaces. The
home composer gains no control, modal, field, or required decision. Quick recording remains one
action to open and one further action to save after typing.

### Offline, Account, Privacy, Reversibility, and Backup

The pages are static product information. They do not read account data, write local or cloud data,
change raw notes, add tracking, or alter backup formats. They are outside authenticated providers so
they remain public and do not cross account boundaries. Removal is limited to the routes, links, and
public-shell exception.

### Verification and Removability

Automated content-contract tests compare policy claims with Calendar model constants and public route
configuration. Browser tests verify signed-out access, navigation, semantics, responsive layout, and
absence of the account gate. The repository quality gate and manual production-URL review provide the
remaining evidence. The feature is isolated to public-page modules, styles, links, and provider routing.

### Exit Condition

Keep the Calendar integration in test/isolated status if the disclosures diverge from implementation,
Google rejects the public URLs, the project cannot maintain an accurate contact/deletion path, or a
future data-flow change cannot be reflected before release.

### Admission Decision

- **Score**: `17/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` as a required support surface for the isolated Calendar feature
- **Red-line check**: No raw-note rewrite, offline regression, new external data recipient, required
  recording step, backup incompatibility, or quality-gate exception is introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide stable public `/about`, `/privacy`, and `/terms` routes that
  render without sign-in and without waiting for account, Google, or Calendar services.
- **FR-002**: Every public page MUST identify Log Note, show an effective/update date and the public
  support email, provide Chinese and English content, and link to the other public pages and the app.
- **FR-003**: The About page MUST describe Log Note's note/planning purpose, optional Google Calendar
  feature, user-facing benefit, and link to the same Privacy URL submitted to Google.
- **FR-004**: The Privacy page MUST accurately disclose authentication profile data; the
  `calendar.events` scope; the primary-calendar read window; read-only treatment of existing events;
  create/update/delete behavior limited to Log Note-marked events; browser-memory token handling;
  account-scoped browser cache; Supabase-synced managed-event references; sharing and Limited Use;
  retention, security, disconnect, revocation, and deletion choices.
- **FR-005**: The Privacy page MUST state that Google user data is not sold, used for advertising,
  or transferred for unrelated purposes, and MUST accurately describe the application's intended
  adherence to the Google API Services User Data Policy, including Limited Use requirements, without
  claiming that an unverified downstream provider is already compliant.
- **FR-006**: The Terms page MUST cover eligibility/account security, user-content ownership and
  permissions, acceptable use, user backup responsibility, third-party services, service changes and
  availability, disclaimers, suspension/termination, terms changes, and contact without inventing a
  legal entity, physical address, or governing jurisdiction.
- **FR-007**: Sign-in and authenticated account settings MUST expose discoverable links to About,
  Privacy, and Terms without adding a primary home-page action or a required recording step.
- **FR-008**: Public pages MUST use semantic landmarks, a single page-level heading, visible keyboard
  focus, readable 16 px minimum body text, 44 px interactive targets, and no horizontal overflow at
  the supported mobile and desktop widths.
- **FR-009**: Public pages MUST NOT initialize account-owned Log Note data or Google Calendar data
  providers, expose browser-stored account data, or add analytics, cookies, or external page assets.
- **FR-010**: Policy content MUST have one structured source of truth so public rendering and
  automated disclosure checks cannot silently drift apart.
- **FR-011**: The Privacy page MUST disclose that explicitly started AI review/organization tools
  send a bounded task-specific selection through the authenticated application endpoint to the
  configured model provider; specifically, Plan review may include overlapping Google event titles
  and times as read-only conflict context. It MUST name excluded credential/image fields, state the
  user-facing purpose and Limited Use boundary, and state that results are temporary unless the user
  explicitly applies a change.
- **FR-012**: The Privacy page and publication checklist MUST keep production OAuth publication
  blocked until the Calendar-to-AI transfer either uses provider contract/settings that prohibit
  generalized-model training and satisfy Limited Use with sufficient in-product consent, or is
  removed from every AI request.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: Existing email/password, Supabase Google sign-in, Meituan SSO, and authenticated route
  protection MUST remain unchanged outside the three explicit public routes.

### Key Entities *(include only when data is involved)*

- **Public policy document**: Versioned bilingual product information with a slug, title, effective
  date, sections, support contact, and links; public and not account-owned.
- **Google Calendar disclosure**: The human-readable contract describing the existing Calendar scope,
  data categories, purpose, storage locations, lifecycle, and user controls; it must remain aligned
  with the Calendar implementation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A clean signed-out browser reaches all three public URLs with HTTP success and sees the
  expected page heading without an account gate or authentication network dependency.
- **SC-002**: Automated checks cover 100% of the material Google-data disclosure categories listed in
  FR-004 and confirm the declared scope and read window from implementation constants.
- **SC-003**: At 320 px, 390 px, and 1280 px, all three pages have no horizontal overflow, all policy
  navigation controls are at least 44 px, and keyboard focus remains visible.
- **SC-004**: Internal links across About, Privacy, Terms, sign-in, and account settings resolve; the
  pages disclose one consistent contact email and effective date in both languages.
- **SC-005**: `npm run check` passes, and a post-deployment manual check confirms the production URLs
  match those entered in Google Cloud before OAuth production publication is accepted.

## Scope Boundaries *(mandatory)*

### In Scope

- Public bilingual About, Privacy, and Terms pages on the Log Note domain.
- A public-route provider boundary and discoverable legal links in sign-in/account settings.
- Automated contract, accessibility, responsive, and signed-out route evidence.
- Accurate text for the current Supabase authentication and Google Calendar implementation.

### Out of Scope

- Clicking Google Cloud's Publish button, completing Google verification, or guaranteeing approval.
- Legal counsel, incorporation, a physical address, a governing-law choice, or jurisdiction-specific
  consumer/privacy compliance certification.
- A new account-deletion UI, cookie banner, analytics, advertising, or generalized consent platform.
- Any change to Calendar scopes, sync behavior, notes, plans, cloud payloads, or backup formats.
- Deployment, domain/DNS changes, commit, push, or release.

## Assumptions and Dependencies

- Log Note is currently an independent personal project, not a represented company or organization.
- `x2742160682@gmail.com` is the approved public support, privacy, and deletion-request contact until
  the user supplies a domain mailbox.
- The same HTTPS production domain will host the app and all three public routes.
- A qualified professional should review the wording before broad commercial or multi-jurisdictional
  distribution; this feature provides an implementation-accurate operational draft, not legal advice.
- OAuth production publication still depends on Google Cloud branding/data-access completion,
  verified-domain ownership, authorized origins/redirects, scope justification, and any required video.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| US1, FR-001–FR-003 | Signed-out browser route and link tests | LN-067 public OAuth release prerequisite |
| US2, FR-004–FR-005, FR-009–FR-012 | Policy-model unit tests plus implementation constant comparison | LN-067 Calendar and optional AI data boundaries |
| US3, FR-006 | Terms content-contract and signed-out browser tests | LN-067 production publication readiness |
| FR-007–FR-008, SC-003–SC-004 | Mobile/desktop browser accessibility and overflow assertions | LN-067 no core-loop/UI regression |
| NR-001–NR-005, SC-005 | `npm run check` and board evidence update | LN-067 existing acceptance and repository quality gate |
