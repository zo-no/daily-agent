# UI Contract: Current-Domain Daily Summary

## Placement and Default State

- Place the section after the selected domain's 30-day chart/detail and before the independent
  seven-day AI summary.
- Show one local fact line: localized today, total count, ordinary count, and periodic count.
- Treat that daily split as the only approved exception to the page's no-permanent-subtype-split rule.
- Use an open-paper section with a thin rule and secondary text action; no card, modal, gradient,
  thick shadow, chat, source list, excerpt, score, suggestion, or write control.
- Initial render, zero data, and the fact line itself perform no remote request.

## Disclosure and Confirmation

The first action expands inline disclosure and sends nothing. It names:

- the localized current domain and exact device-local date;
- total ordinary/periodic qualifying records;
- sent and omitted counts when any source is omitted;
- that selected record text will leave the browser for the configured AI service;
- that the result remains only on this page, is not saved/exported/backed up, and cannot change or
  delete records.

Start summary and Cancel are separate 44×44px-minimum buttons. Cancel returns to idle and restores
focus to the open action.

## Loading, Result, and Retry

- Loading shows one short polite status and Stop. Stop aborts, clears transient state, and restores
  focus to the opener.
- Success shows one overview of at most three sentences and up to three ruled theme rows, each with a
  title and one sentence.
- The UI never displays overview/theme entry IDs, source indexes/links, excerpts, provider details,
  prompt text, follow-up input, recommendations, or persistence actions.
- Re-analyze and Retry return to disclosure; they cannot request until Start is confirmed again.
- Daily state never changes or reuses the adjacent weekly result.

## Empty, Invalid-Source, and Failure States

- Zero qualifying records: quiet “no records today” text, no Start action, and zero request.
- Records exist but none can pass strict transport validation: bounded no-send text and no request.
- Offline/unconfigured/auth/rate/timeout/upstream/invalid/unsafe: concise localized unavailable text;
  no local concatenation or rules output may be labelled as an AI summary.
- Account/domain/name/date/locale/source changes, page exit, Stop, or a newer request clear all daily
  transient state and prevent late completion.
- Investment-like domains retain the existing fixed non-advice boundary; unsafe output is never
  partially rendered.

## Accessibility and Responsive Behavior

- All actions are real buttons with localized accessible names, visible focus, logical keyboard
  order, and touch targets at least 44px in each dimension.
- Dynamic state lives in one polite atomic live region; loading uses `aria-busy` without a focus trap.
- Long Chinese/English domain names and all required disclosure text wrap at
  320/390/426/768/1280px without document overflow or control overlap.
- Reduced-motion removes nonessential transition; no meaning depends on motion or color.
