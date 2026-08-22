# Data Model: Left-Workspace Tools

No new persisted entities or storage fields are introduced.

## UI State

- **Search visibility**: transient home state indicating whether Search occupies the left workspace.
- **Settings visibility**: transient home state indicating whether Settings occupies the left workspace.
- **Embedded active panel**: transient local panel identifier for one of General, Account, Download,
  Restore, Images, or Record setup.
- **Tool focus owner**: the initiating rail button retained by Home for toggle-close and Escape focus restoration.
- **Mounted diary state**: the underlying diary workspace remains mounted and inert while Search or Settings covers the left content area.

All existing records, plans, structures, settings payloads, account identities, revisions, attachment
references, and backup formats remain unchanged.
