# Quickstart Validation: 静态资源缓存优先

## Prerequisites

- Install the repository dependencies.
- Use a Chromium binary available to the existing Playwright PWA test.

## Focused validation

1. Run `node --test tests/service-worker.test.mjs`.
2. Confirm the cached build-resource scenario reports no network fetch, while cache-miss and excluded-request scenarios remain covered.
3. Run `npm run test:pwa`.
4. Confirm production evidence still proves installability, static resource offline availability, API/RSC/auth cache exclusion, account-local persistence and controlled update.

## Full gate

1. Run `npm run check`.
2. Run `git diff --check`.
3. Review the diff against [spec.md](./spec.md), [plan.md](./plan.md), and [cache-policy.md](./contracts/cache-policy.md). Ensure no data-provider, API, account, backup, or unrelated dirty file changed.

## Expected outcomes

- Repeated access to a cached versioned build resource does not start another network request.
- A first successful resource access is available while offline later.
- API, RSC and authentication callback responses are absent from the application cache.
- An uncached offline resource fails as a resource, and the activation leaves only the current shell version.
