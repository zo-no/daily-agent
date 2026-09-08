# Quickstart validation

1. Start the app with `npm run dev` and open `/goals`.
2. Create a Goal with a start and end date. Open its detail action.
3. Add one numeric KR and one qualitative KR. Confirm the numeric card shows bounded progress and the qualitative card shows evidence/status.
4. Seed or create records inside and outside the period. Confirm the detail timeline groups by date and preserves time/content, and shows recorded-day and missing-day counts.
5. Open AI analysis disclosure. Confirm the payload summary contains only current-goal fields. Cancel and confirm no request is made; with a configured provider, confirm the result is read-only.
6. Run `npm run test:node -- tests/okr-progress-model.test.mjs tests/okr-progress-route.test.mjs tests/goal-model.test.mjs`, `npm run design:check`, and `npm run check`.
