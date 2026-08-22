# Quickstart: Left-Workspace Tools

1. Start the existing app with `npm run dev` and open the authenticated home route.
2. At 390px, scroll the diary to a non-zero position and note the selected date and Diary/Plan mode.
3. Record the bounding boxes of the right binding rail, directory, Diary/Plan switch, export, and record actions.
4. Activate Search. Verify the query and results occupy only the left workspace, there is no viewport backdrop, and every recorded right-side box is unchanged within 1px.
5. Activate Settings. Verify Search is replaced directly, the URL remains `/`, the diary stays mounted and inert underneath, and the right side remains unchanged.
6. Open General, Account, Download, Restore, Images, and Record setup in turn. Verify the mobile detail
   back control returns to the six-item index without closing the tool.
7. Close Settings with its active rail control, reopen, then close using Escape. Verify focus returns to Settings and the original scroll/date/mode remain.
8. Repeat at 320, 426, 600, 671, 700, 768, and 1280px; verify tools stay left of the binding axis with no horizontal overflow.
9. Visit `/settings#record-setup` and `/settings#structure` to verify direct route compatibility.
10. Run `npm run design:check` and `npm run check`.
