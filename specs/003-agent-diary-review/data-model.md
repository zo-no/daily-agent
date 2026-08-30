# Data Model: In-page Agent Diary Review

No persisted entity or storage version is added.

## Transient ReviewSession

- `status`: idle, scanning, reviewing, complete, or error
- `date`: selected natural day
- `items`: normalized ReviewItem queue
- `activeIndex`: current queue position
- `messages`: bounded active-row conversation
- `requestId` / abort signal: prevents stale responses from replacing a newer session
- `lastCategoryUndo`: previous and applied category IDs for the latest confirmed category action

## Transient ReviewItem

- `id`: session-local stable identifier
- `entryId`: allowlisted current-day ordinary record ID
- `kind`: question, category, or note
- `prompt`: bounded Agent question or comment
- `categoryId`: optional allowlisted existing category
- `proposedAppend`: optional bounded suggestion, never applied automatically

## Persistent writes

- Append: updates only the confirmed record's `content`.
- New record: creates a normal ordinary entry for the selected day using existing defaults.
- Category: updates only the confirmed record's `categoryId`; latest change is undoable.
- Keep/dismiss/chat: no persistent write.
