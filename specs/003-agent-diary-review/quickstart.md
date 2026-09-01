# Quickstart: In-page Agent Diary Review

1. Open an authenticated day containing at least three ordinary records at 390px.
2. Activate the illustrated idle Agent and verify the URL stays `/`, status announces scanning, and quick-add/rail geometry stays fixed.
3. Verify the active Diary child disappears, no dashed/long underline is drawn under the source record, and a compact conversation appears directly beneath it with one short local accent.
4. Send a casual reply and confirm no persistent state changes.
5. Answer a detail question, choose keep original, and confirm byte-for-byte preservation.
6. Repeat and choose append; confirm only the source content changes. Repeat with new record; confirm the source remains unchanged.
7. Confirm an existing category suggestion, verify only `categoryId` changes, then undo it.
8. Switch date, enter Plan, open Search, and refresh during sessions; each must cancel/clear safely.
9. At 390px, verify Search / Calendar / Settings / Export are icon-only controls with accessible names and at least 44px hit areas, sit about 28px to the right of the binding line, and expose no visible utility/export text labels or double-ring export stamp.
10. Verify the `16px` Sans source record remains stronger than the `13px` supporting Sans Agent question; category/actions/placeholder use `12px`, the textarea remains `16px`, and every action remains at least 44px.
11. Verify question, category, and reply begin on the actual source-text edge; the short source marker stays in the gutter; progress precedes the upper-right close; actions terminate on the conversation right edge.
12. At 390px, confirm the Agent summary ends within 18px of the Record heading, the time/content gutter is no wider than 52px, ordinary and fixed one-line rows are no taller than 56px, and the fixed-tool visual slot/first-row offset is no greater than 28px.
13. In category state, confirm the reply field keeps at least 220px at 390px and 160px at 320px, while Apply category and Keep original form one right-aligned row immediately below it without overlap; confirm the visible close surface is clear inside its 44px target. In resolved-question state, confirm all three 44px actions remain in one row.
14. Repeat offline and with reduced motion. Repeat at 320, 426, 600, 671, 700, 768, and 1280px; confirm Plan Agent and the right icon lane are unchanged.
15. Visit `/organize?date=...` to verify direct compatibility, then run `npm run design:check` and `npm run check`.
16. Seed one note with a single clear non-current category match and verify analysis offers that category directly without a generic question.
17. Seed one note with two plausible existing categories and verify analysis asks one discriminating question; answer with one candidate's meaning and verify the input closes, the category path appears once, and no local data changes before Apply category.
18. Apply and undo the clarified category, then repeat with an answer that supplies detail rather than a category; verify only append/new-record/keep actions appear and category is not simultaneously actionable.
19. Return invalid, non-candidate, already-current, simultaneous append/category, and two-turn unresolved replies; each must become a visible no-change state with Keep original and no further reply field or write.
20. Run the server-side runtime test under Node 22 and verify one registered Mastra Agent, one registered Diary workflow, exactly one model transport call per analyze/reply run, and project normalization after the framework result.
21. Send the existing Plan Agent request through `/api/organize/agent` and verify it retains its previous direct behavior; no Mastra Diary workflow state, memory, tools, or storage is created.
22. Run a production Next.js standalone build and confirm the embedded Mastra imports resolve without adding a separate server process or public endpoint.
23. Confirm `@mastra/core` remains exactly pinned and the supported acceptance run uses Node `>=22.13.0`. Treat any Node 20 focused/build success as diagnostic only; do not deploy this change through the current Plus/Cargo/CatPaw Node 20 contract until that runtime is explicitly upgraded or isolated.
