# Research: Confirmed Seven-Day Domain Summary

## Decision 1: Keep a separate route and model contract

Use `/api/organize/domain-review`, not the existing classifier, daily chronology, or row-local Agent
route. The seven-day current-domain payload, one-shot theme response, and financial safety rejection
are semantically distinct. Reusing a route would make its allowlist and response contract ambiguous.

## Decision 2: Reuse security primitives, not local fallback semantics

Reuse same-origin, JSON, Bearer, body-limit, no-store, rate-limit, timeout, and Supabase verification
helpers from the existing AI boundary. Do not reuse providers that silently return deterministic
local “AI” results: weekly failure must remain visibly unavailable while the factual line stays local.

## Decision 3: Select in the browser from the active account payload

The page already holds the correct account-isolated local document and current domain. A pure
selector can enforce the seven local dates and category→domain/template→source-type relationships
without sending category trees, template IDs, or account identifiers to the server.

## Decision 4: Count all qualifying records, transmit only the newest 80

Disclosure reports total ordinary/periodic counts and explicit omitted count. Transmission sorts by
descending local date, valid time, then stable ID and takes 80. This preserves a deterministic,
reviewable boundary when a week is unusually dense.

## Decision 5: Reject, rather than repair, unsafe model output

Unknown entry IDs, duplicate themes, schema/length violations, and investment advice invalidate the
whole result. Dropping only the unsafe fragment could make the remaining result look fully trusted
and hide that the model ignored its contract.

## Decision 6: Use an inline disclosure and result

The feature is secondary to the local line. A ruled inline region keeps the paper/blue-ink language,
avoids a modal or dashboard card, and makes the request boundary visible immediately beside its
source context. No image or new visual asset is required.
