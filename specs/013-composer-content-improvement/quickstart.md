# Quickstart: Verify Hero-Triggered Composer Content Improvement

Use Node.js `>=22.13.0`. Tests use synthetic content and mocked Provider responses; they must not send
real private notes.

## Focused contract checks

```bash
node --test \
  tests/content-improvement-model.test.mjs \
  tests/content-improvement-provider.test.mjs \
  tests/ai-content-improvement-route.test.mjs \
  tests/agent-review-runtime.test.mjs \
  tests/project-structure.test.mjs
```

## Focused browser check

```bash
env E2E_TEST_FILTER="composer content improvement" node e2e/run-mobile.mjs
```

The scenario must prove ordinary-only Hero rendering, empty zero-request, one request, same-area
original/candidate review, cancel, use then existing `Done`, stale/error zero-write, focus, 44px
targets, and 320/390/426/1280px no overflow or overlap.

## Full gates

```bash
npm run design:check
npm run check
git diff --check
```

## Manual evidence that remains open

- Review one non-sensitive real configured-Provider result for factual preservation and useful prose.
- Record start-to-success latency for at least three successful requests.
- Confirm at 390px that Hero feels present but does not cover writing or suggest automatic saving.
- Observe use/cancel/rewrite behavior over 14 days before product acceptance.
- Do not deploy, commit, or push as part of this quickstart.
