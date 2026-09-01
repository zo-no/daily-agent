# Data Model: In-page Agent Diary Review

No persisted entity or storage version is added.

## Transient ReviewSession

- `status`: idle, scanning, reviewing, complete, or error
- `date`: selected natural day
- `items`: normalized ReviewItem queue
- `activeIndex`: current queue position
- `messages`: bounded active-row conversation
- `replyOutcome`: empty, ask, append, category, or none
- `proposedCategoryId`: optional allowlisted category produced after clarification
- `requestId` / abort signal: prevents stale responses from replacing a newer session
- `lastCategoryUndo`: previous and applied category IDs for the latest confirmed category action

## Transient ReviewItem

- `id`: session-local stable identifier
- `entryId`: allowlisted current-day ordinary record ID
- `kind`: question or category; an unhelpful record produces no item
- `prompt`: bounded Agent question or generic category rationale
- `categoryId`: optional allowlisted existing category
- `proposedAppend`: optional bounded suggestion, never applied automatically
- `questionGoal`: optional clarify-category or enrich-detail purpose
- `candidateCategoryIds`: zero for detail questions or two to three existing non-current IDs for classification clarification

## Transient ReplyOutcome

- `outcome`: ask, append, category, or none; mutually exclusive
- `reply`: bounded session-only Agent text
- `proposedAppend`: present only for append
- `categoryId`: present only for category and restricted to an allowlisted non-current candidate
- `terminal`: append, category, and none close the reply field; ask remains conversational until the two-answer cap

## Persistent writes

- Append: updates only the confirmed record's `content`.
- New record: creates a normal ordinary entry for the selected day using existing defaults.
- Category: updates only the confirmed record's `categoryId`; latest change is undoable.
- Keep/dismiss/chat: no persistent write.
- Classification clarification: no write until the existing Apply category action; the existing undo snapshot remains the only reversible category state.
