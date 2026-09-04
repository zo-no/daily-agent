# UI and Studio Contract: Calendar and Diary Review

- The today Calendar/diary section is global to Insights, before selected-domain content, and uses open-paper
  hierarchy rather than a card/modal/chat.
- Local facts perform no network request. No Calendar cache means clear empty text and no Agent action.
- The first action opens a disclosure with source counts, exact outbound fields, exclusions, and no-write lifetime.
  Only a separate approval starts one request; Cancel/Stop/Retry cannot bypass approval.
- Result renders overview and up to 12 ruled suggestions. IDs, source excerpts/links, Provider metadata, prompts,
  apply/save/task/reminder controls, and Calendar write controls are never rendered.
- All dynamic states are keyboard/touch accessible, actions are at least 44px, focus returns predictably, and five
  target widths have no overflow.
- Studio lists one Calendar/diary Agent and workflow. A run with synthetic input visibly suspends at approval before
  generation and can resume with exact approve/reject data. Studio is localhost developer tooling, not product UI.
