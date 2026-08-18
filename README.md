# Log Note

Log Note is a mobile-first personal recording app with account-owned local caches. Sign in with email/password or Google, write locally without waiting for the network, and let text records, plans, structure, and settings save automatically to Supabase.

The product currently focuses on reliable recording, structure management, export, authenticated offline use, and revision-safe text synchronization. Its isolated smart-organize page can use a server-side DeepSeek classifier to file one chosen day into the account's existing domain/category structure, with local-rule fallback and explicit apply; it does not create categories or tags, rewrite notes, perform free-form generative analysis, automatically merge conflicts, or store images in the cloud.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3100](http://127.0.0.1:3100). The development command pins one loopback address and port `3100`, so duplicate IPv4/IPv6 dev servers cannot share the same Next.js build output.

Copy `.env.example` to `.env.local`, add the Supabase project URL and publishable key, then run the SQL files in `supabase/migrations/` in filename order. Projects that already ran the initial document migration must also run `20260816170000_require_expected_revision.sql`; it closes the `NULL` expected-revision CAS edge before real synchronization is enabled.

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
- Markdown export for the current day or all dates; idempotent merge import for dated daily Markdown; full text-state JSON backup and restore; portable attachment backup; structure-only JSON export plus a general structure JSON example.
- One optional JPEG, PNG, or WebP image on a free-text record, stored offline in IndexedDB and rendered only from a local object URL.
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
- **Full JSON backup**: domains, categories, templates, Markdown settings, entries, and attachment references. It never embeds image bytes.
- **Portable backup**: the same versioned state plus referenced local images and SHA-256 checksums in one `.lnbackup` file. Use this when moving records with images.
- **Structure JSON**: domains, categories, templates, and Markdown settings only; useful as an editable structure reference.
- **General structure JSON**: a minimal example of the supported structure schema.

Markdown is configurable through the export settings. It can be grouped by domain/category or emitted as a flat timeline, and supports editable heading, entry-line, date-heading, and separator templates.

## Account and data safety

First use requires a Supabase account. Each account receives a separate versioned `localStorage` cache; optional image Blobs are stored in IndexedDB with the same account ownership boundary. Text records, plans, structure, and settings synchronize automatically through a compare-and-swap revision, so a stale device stops instead of silently overwriting newer cloud data. Images stay local and remote image URLs are never loaded. Export JSON regularly, and use the portable backup when records contain images.

Cloud text updates preserve the current device's image references for records that still exist. A cloud read failure never turns directly into a write with an unknown revision; Log Note reads and reconciles again before deciding whether it is safe to save.

If saved JSON cannot be parsed or migrated, Log Note does **not** overwrite it with defaults. The original local payload remains untouched and automatic persistence stays blocked until a user-confirmed restore has been written successfully.

## Verify

Install the Chromium revision expected by Playwright once on a new machine:

```bash
npx playwright install chromium
```

Run the complete local quality gate:

```bash
npm run check
```
