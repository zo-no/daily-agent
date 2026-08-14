# Log Note Design System

> Log Note should be quiet enough that recording feels effortless, and rigorous enough that years of records remain understandable to people and future AI systems.

## Product context

- **Product:** a local-first personal recording app for linear notes and periodic daily records.
- **Primary task:** capture a record with the fewest possible decisions.
- **Secondary task:** maintain a dependable Domain → Category → Template structure.
- **Default language:** English, with complete Simplified Chinese UI support.

## Visual thesis

A precise recording instrument with the warmth of paper and the restraint of serious software. Typography, alignment and fine dividers express hierarchy; decoration does not.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Page surface | `--paper` | `#F7F4ED` |
| Raised surface | `--paper-raised` | `#FFFDF8` |
| Primary ink | `--ink` | `#171712` |
| Secondary ink | `--muted` | `#6F6B61` |
| Divider | `--line` | `#D8D2C6` |
| Primary action | `--accent` | `#1F52FF` |

- UI and body: Instrument Sans.
- Editorial headings: Instrument Serif.
- Time, order and numeric values: IBM Plex Mono with tabular numbers.
- Type scale: display `36–52px`, page/domain title `28px`, section title `22px`, category heading `18px`, body/content `16px`, UI label `14px`, metadata/count `12px`.
- Reading hierarchy follows content structure: page/date → domain → category → record or metric → value/supporting text. A child label or value must not visually overpower its parent category.
- Read-only hierarchy uses size, weight, whitespace and progressive indentation. Decorative vertical connector lines are not used on the record page.
- Spacing uses a 4px base. Prefer 4, 8, 12, 16, 24 and 32px.
- Radius is functional: 5–7px for controls, larger radii only for floating actions or bottom sheets.

## Interaction rules

- Recording remains the shortest path and must not expose structure maintenance by default.
- Structure management uses explicit drag handles, not whole-row dragging.
- Pointer and keyboard dragging are never the only controls; every sortable row provides Move up, Move down and, where relevant, Move to… actions.
- Hover and control transitions use 140–180ms. Drag lift and drop use 180–240ms.
- Periodic records use rhythm/cadence and value styling; linear records use a compact timeline.
- Empty hierarchy groups are valid drop targets and show one quiet instructional line.

## Source of truth

Detailed rules, writing guidance and research are routed from [设计规范/index.md](设计规范/index.md). When code and this document disagree, fix the code or record an explicit product decision before changing this document.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-12 | Quiet and rigorous direction | Reduce recording friction without weakening long-term structure. |
| 2026-08-12 | Local font packages | Offline and CI builds must not depend on Google Fonts. |
| 2026-08-12 | dnd-kit plus menu fallback | Support pointer, touch and keyboard use without making drag the only path. |
| 2026-08-14 | Semantic type hierarchy | Users scan top-to-bottom and left-to-right; domain and category context must be understood before individual records or values. |
