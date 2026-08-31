# UI Contract: Confirmed Seven-Day Domain Summary

## Placement and hierarchy

- The existing local domain selector, heading/evidence line, interactive 30-day line, and selected-day
  detail remain primary and fully local.
- After the chart/detail area, one thin rule introduces a borderless secondary text action.
- No rounded dashboard card, modal, gradient, thick shadow, chat composer, source index, or record excerpt.

## Disclosure state

First activation creates no network request. The inline disclosure names:

- current localized domain;
- inclusive local seven-day start/end;
- total ordinary and periodic qualifying records;
- number sent and omitted when newest-80 truncation applies;
- that record text will be sent to the currently configured AI service;
- that result remains only in this page session, is not saved, and cannot rewrite notes.

Start summary and Cancel are separate controls with 44×44px minimum targets. Cancel returns to idle.

## Loading, result, and retry

- Loading shows one short status and Stop; Stop aborts and clears the session.
- Limited samples show one fixed marker before the provider result.
- Success shows an overview of at most three sentences followed by up to three ruled theme rows, each with
  title and one sentence only.
- Re-analyze returns to disclosure and sends nothing until Start summary is confirmed again.
- The UI never displays provider entry IDs, source links, excerpts, hidden prompt text, or chat.

## Empty and failure states

- Zero record: visible quiet “No records to summarize” state; no Start action and no request.
- Offline/unconfigured/auth/rate/timeout/upstream/invalid: concise unavailable copy; do not expose
  server/provider details or manufacture a local AI result.
- Investment unsafe output: concise safety-unavailable state plus the existing fixed non-advice boundary.
- Domain/account/page change clears disclosure/result and prevents late completion from appearing.

## Accessibility and responsive contract

- All actions are real buttons, keyboard reachable, focus-visible, and at least 44px in both axes.
- Status/result changes use a polite live region; loading uses `aria-busy` without trapping focus.
- Disclosure and theme copy wrap at 320/390/426/768/1280px without horizontal document overflow.
- Long Chinese/English domain names remain contained; the existing selector owns any horizontal scroll.
- Reduced-motion preference removes nonessential transitions; no state depends on animation or color.
