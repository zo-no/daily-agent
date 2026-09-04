# Research: Calendar and Diary Review

## Decision 1: Compare the existing account-scoped cache, not Google APIs

Insights consumes `useGoogleCalendar()` and filters its timed/all-day cache to device-local today. The server and
Studio never receive OAuth credentials or direct Google access. This preserves the existing owner/cache boundary,
works with stale-but-visible offline cache, and avoids a second Calendar read path.

## Decision 2: Place human approval before external transfer

Local facts and counts run before approval. Opening the disclosure sends nothing. Production calls the route only
after explicit approval. The Studio workflow uses an actual suspend/resume step at the same risk boundary: it
suspends after validation/counting and before Agent generation; reject returns without calling the Agent.

## Decision 3: Use request-local opaque IDs and complete stale binding

The browser sorts and bounds current sources, maps them to `event-001`/`entry-001`, and fingerprints every field in
the exact projection. Request ID, target date, locale, and fingerprint are echoed in the response. Any change or
newer generation invalidates the result. Real Google/record IDs are never transmitted.

## Decision 4: Keep suggestions inert and narrowly typed

The Agent may describe only Calendar items with no diary match, diary records without a Calendar match, or timed
Calendar overlap. Every suggestion references current opaque IDs. Strict schemas plus the project normalizer reject
unknown fields/kinds, forged IDs, duplicates, empty prose, and unsafe commands. There is no apply action or write.

## Decision 5: Separate production execution from Studio suspension

The product's HTTP lifecycle cannot park a request for human input, so the UI owns approval before the request and
then uses the existing request-scoped no-snapshot structured workflow. Studio registers a code-defined workflow
whose suspend state is only local developer run state with synthetic input. Both reuse the same schema, instructions,
and normalizer, avoiding parallel business rules while keeping Studio out of product runtime.

## Decision 6: Adopt the existing draft, do not create a second feature

The untracked `daily-plan-review` draft already contains relevant UI/route/provider/model seams. Rename and revise it
to Google Calendar semantics, then mount it in Insights. Local plan blocks remain out of LN-081 because the user
specifically requested Calendar content and LN-079 explicitly excluded plan comparison.
