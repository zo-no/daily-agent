# Research: OAuth Public Policies

**Board Item**: `[LN-067]`
**Date**: 2026-08-31

## Decision 1: Host public policy pages on the application origin

- **Decision**: Publish `/about`, `/privacy`, and `/terms` on the same HTTPS origin as Log Note and
  allow direct signed-out access.
- **Rationale**: Google OAuth review expects a public homepage that describes the app and links to
  the same privacy-policy URL submitted in Cloud Console. A same-domain route is stable, reviewable,
  and avoids a second publishing system.
- **Alternatives considered**: Google Docs and repository Markdown were rejected because their
  ownership, URL, presentation, and availability are outside the application release. Login-only
  pages were rejected because reviewers and prospective users must read them before authorization.

## Decision 2: Bypass account/data providers only for an explicit allowlist

- **Decision**: Introduce one application provider shell with the exact public allowlist
  `/about`, `/privacy`, `/terms`; all other routes keep the existing authentication gate and account
  data providers.
- **Rationale**: The current root layout wraps every route in the gate. An exact allowlist provides
  the smallest auditable exception and prevents public pages from initializing account-owned record
  or Calendar state.
- **Alternatives considered**: Making all marketing-like routes public by prefix was rejected as too
  broad. Initializing account providers and changing only the visible gate was rejected because the
  pages should not depend on or touch account-owned state.

## Decision 3: Use one structured, bilingual policy source

- **Decision**: Store shared identity, effective date, route metadata, and parallel English/Chinese
  policy sections in a pure module consumed by pages and tests.
- **Rationale**: The product already supports both languages; Google reviewers and current Chinese
  users need equivalent disclosures. A pure source lets Node tests check material statements without
  parsing JSX or duplicating legal prose.
- **Alternatives considered**: Translation-key fragments were rejected because long policy text is
  harder to review as disconnected keys. Separate English/Chinese pages were rejected because they
  create URL and version drift.

## Decision 4: Disclose implementation facts, not aspirational behavior

- **Decision**: Bind statements to the current implementation: `calendar.events`; primary calendar;
  30 days before through 91 days after today; unmarked events read-only; writes/deletes only for
  privately marked Log Note events; access token in browser memory; account-scoped local Calendar
  cache; only managed-event references stored with Log Note plans in the Supabase-synced document.
- **Rationale**: Google's policy requires accurate access, use, storage, and sharing disclosure. The
  policy must change before any material implementation change ships.
- **Alternatives considered**: General wording such as “we may access calendar data” was rejected as
  insufficiently specific and unable to prove least-privilege or Limited Use compliance.

## Decision 5: Conservative independent-project terms

- **Decision**: Identify Log Note as an independent personal project, retain the author's support
  email, and omit a legal entity, street address, and governing-law clause until the owner supplies
  verified facts or legal advice.
- **Rationale**: Fabricated legal identity or jurisdiction is worse than a narrow operational terms
  draft. The terms can still cover ownership, account responsibility, acceptable use, availability,
  third-party services, suspension, changes, and contact.
- **Alternatives considered**: Generic templates naming an invented company or automatic home-country
  jurisdiction were rejected as unsupported legal claims.

## Decision 6: No new tracking or consent technology

- **Decision**: The public pages use bundled fonts and same-origin assets only and add no analytics,
  advertising, cookie banner, or policy acceptance checkbox.
- **Rationale**: The requested release artifacts do not require new data collection. Adding it would
  expand privacy scope and create a consent obligation unrelated to Calendar publication.
- **Alternatives considered**: Page analytics were rejected because review traffic is not product
  evidence worth a new data boundary.

## Decision 7: Keep OAuth publication blocked on the Calendar-to-AI transfer

- **Decision**: Disclose the implemented Plan-review transfer precisely and keep the Google OAuth app
  in test status until either (a) the configured AI provider's contract/settings prohibit
  generalized-model training of Google Workspace data and the in-product consent flow is sufficient,
  or (b) Calendar-derived context is removed from every AI request.
- **Rationale**: Google Workspace Limited Use prohibits transferring, selling, or using Workspace data
  to create, train, or improve a generalized machine-learning/AI model. The current DeepSeek public
  privacy materials say service input may be used to develop, improve, or train its technology and
  provide an opt-out, while the current Log Note Plan-review route can send overlapping Google event
  titles and times. A public policy can disclose that behavior, but disclosure alone does not make the
  production flow compliant. The operator must resolve and evidence the provider/data-flow condition
  before publication.
- **Alternatives considered**: Claiming the provider never trains on input without a verified contract
  or setting was rejected as unsupported. Hiding the transfer was rejected as misleading. Changing the
  Plan Agent behavior was rejected as outside this policy-only implementation authorization.

## Decision 8: Make About a product story, not a fourth policy document

- **Decision**: Keep Privacy and Terms in the bilingual document shell, but give `/about` a dedicated
  editorial landing composition backed by the same pure public-content module and shared navigation.
  Use a fixed HTML/CSS product illustration instead of a real account screenshot or live app embed.
- **Rationale**: A mature homepage must establish product identity, use, and trust before legal detail.
  A fixed illustration is responsive, offline, reviewable, and cannot leak real records or initialize
  account providers. The open-paper layout fits Log Note's existing visual system without becoming a
  generic collection of cards.
- **Alternatives considered**: Keeping two long policy columns was rejected because it reads as release
  paperwork rather than a product. Publishing current screenshots was rejected because local evidence
  may contain user data and ages quickly. A live embedded app was rejected because it crosses the
  signed-out provider boundary. Stock photography and AI-generated lifestyle imagery were rejected
  because they do not prove the product workflow.

## Official external requirements used

- Google API Services User Data Policy: accurate identity and intent; transparent access, use,
  storage, and sharing; minimum permissions; secure handling; and Limited Use restrictions.
- OAuth verification preparation: public app homepage and privacy URL on a verified/owned domain,
  production publication, scope justification, and demonstration evidence when requested.
- App homepage guidance: accessible without login, describes the app, and links to privacy policy.

## Remaining manual decisions

- Replace the public Gmail support address with a domain mailbox if the owner creates one.
- Obtain qualified legal review before broad commercial distribution or selecting a jurisdiction.
- After deployment, verify the exact production URLs and only then submit them in Google Cloud.
