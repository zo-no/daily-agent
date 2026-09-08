# Quickstart Validation: Quick Record Bar

1. Start the app with the repository's normal development command and open the home page.
2. Seed or create one record for today. Click `记`; verify the page is in Time view, the `记录` heading is visible, and the input under it is focused.
3. Navigate to a historical date and click `记`; verify the selected date returns to today before saving. Enter two notes and verify the row remains above latest-first entries.
4. On an empty day, click `记`, save one non-empty note, reload, and verify the Record section and entry remain.
5. Click `+` in Diary/Time and inspect date, time, category, template, attachment, and save behavior. Switch to Plan and verify plan creation is unchanged.
6. Exercise blur, Enter, Escape, empty input, failed save, pointer movement, pointer leave/cancel, threshold release, and keyboard Enter/Space.
7. Run:

```bash
npm run design:check
npm run check
git diff --check
```

