# Log Note

Log Note is a mobile-first, local-first personal recording app. It keeps the capture flow short: choose a template when useful, write the record, and export your data whenever you need it. It does not require an account or network connection.

The product currently focuses on reliable recording, structure management, and export. It does not include AI analysis, recommendations, sync, accounts, or a server-side database.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3100](http://localhost:3100). The development command uses port `3100`.

For a production build:

```bash
npm run build
npm start
```

## What is included

- Record page with a compact linear timeline, a grouped-by-domain view, search, edit, delete, and a primary `+` action.
- Separate periodic-record section for scheduled/value-oriented entries, so daily, weekly, and time-point records do not mix into the linear timeline.
- Template-driven entry capture: free text, structured fields, and value entry. Structured fields support text, multi-line text, numbers, options, ratings, and required fields.
- A dedicated Record setup page at `/templates` with the explicit hierarchy **Domain → Category → Template**.
- Two management views: Structure manages domains and categories; Templates manages templates within their categories.
- Keyboard- and touch-accessible ordering for domains, categories, templates, and template fields. Categories can move between domains; templates can move between categories, carrying their historical entries to the new category.
- Built-in periodic cadences: a time point, daily, or weekly. Periodic templates retain their schedule and are ordered separately from linear records.
- Markdown export for the current day or all dates; full JSON backup and restore; structure-only JSON export plus a general structure JSON example.
- English as the default interface language and Simplified Chinese as a complete interface option. Changing language does not translate record text.
- PWA manifest, offline cache, and add-to-home-screen support.

On first use, the app creates **14 non-empty seed records** from `2026_08_11.md`. Their record content and source lines are kept unchanged; blank records and fixed-value placeholders without a value are intentionally excluded.

## Data model

The exported structure is a versioned JSON hierarchy:

```text
Domain
└── Category
    └── Template
        └── fields[] (display and Markdown order)
```

Domains, categories, and templates each have an explicit sibling `order`. Template field array order is the single source of truth for form order, composed record content, and Markdown output.

An entry references `categoryId` and optionally `templateId`. Moving a template to another category updates the category of its existing entries; moving a category to another domain changes its inherited domain without rewriting records.

## Export and backup

- **Current-day Markdown**: a readable file for the selected date.
- **All Markdown**: all recorded dates in one file.
- **Full JSON backup**: domains, categories, templates, Markdown settings, and entries. Use this for migration or restore.
- **Structure JSON**: domains, categories, templates, and Markdown settings only; useful as an editable structure reference.
- **General structure JSON**: a minimal example of the supported structure schema.

Markdown is configurable through the export settings. It can be grouped by domain/category or emitted as a flat timeline, and supports editable heading, entry-line, date-heading, and separator templates.

## Local-data safety

All application data is stored in this browser under `localStorage`; nothing is uploaded by the app. Browser data clearing, private browsing, another browser profile, another origin, or another port creates a different data space or may make local data unavailable. Export a full JSON backup regularly.

If saved JSON cannot be parsed or migrated, Log Note does **not** overwrite it with defaults. The original local payload remains untouched and automatic persistence is blocked. A successful, user-confirmed JSON restore may resume saving. The code also exposes an explicit reset path for a future confirmed reset UI; it is not an automatic fallback.

## Verify

```bash
npm test
npm run design:check
npm run build
```
