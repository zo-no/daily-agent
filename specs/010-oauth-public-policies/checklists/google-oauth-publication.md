# Google OAuth Publication Checklist

**Board Item**: `[LN-067]`
**Purpose**: Release-specific content and console readiness review

## Public identity

- [ ] Production `/about` is HTTPS, public without login, and identifies Log Note.
- [x] About describes the app and the optional Google Calendar benefit.
- [ ] About links to the exact production `/privacy` URL submitted to Google.
- [ ] Support contact is current and monitored.

## Privacy disclosure

- [x] Access, use, storage, sharing, retention, security, and deletion are disclosed.
- [x] Calendar scope, primary calendar, read window, and read-only existing events are accurate.
- [x] Log Note-managed event create/update/delete authority is accurate.
- [x] Browser-memory token, account-scoped local cache, and Supabase event references are accurate.
- [ ] No sale, advertising, unrelated transfer, or unrelated AI use is claimed and true.
- [ ] Google Limited Use statement is present and true.
- [x] Chinese and English material statements remain equivalent.

## Terms and product boundary

- [x] Terms do not invent a company, address, jurisdiction, or professional review.
- [x] Account, content ownership, acceptable use, backups, third parties, availability, termination,
      changes, and contact are covered.
- [x] No public page initializes account-owned record or Calendar providers.
- [x] Authenticated business routes remain protected.

## Google Cloud after deployment

- [ ] Production domain ownership is verified.
- [ ] Authorized JavaScript origins and redirects exactly match production HTTPS URLs.
- [ ] Branding homepage and privacy URLs exactly match the tested production routes.
- [ ] Data Access scope justification explains the user-facing Calendar feature and least privilege.
- [ ] Consent screen and demonstration video use the same production identity and workflow.
- [ ] The configured AI provider contract/settings prohibit generalized-model training of Google
      Workspace data, or Google Calendar-derived context is removed from every AI request.
- [ ] A clear in-product disclosure of any Calendar-to-AI transfer appears before the relevant
      consent/action and receives affirmative user consent.
- [ ] OAuth app is moved to Production only with explicit owner authorization.

## Evidence

- [x] Public-route focused tests pass.
- [ ] `npm run check` passes.
- [ ] Signed-out production screenshots/URL checks are recorded.
- [ ] Real Google account sync lifecycle remains manually verified under LN-067.
