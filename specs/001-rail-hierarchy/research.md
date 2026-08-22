# Research: Right Rail Visual Hierarchy

## Decision

Keep the existing rail DOM and generated PNG family; adjust only semantic spacing and type roles.

## Rationale

The current implementation already satisfies the data boundary, keyboard order, common axis, and asset contract. The supplied screenshot identifies scale and grouping—not missing behavior—as the defect. A CSS-only change is the smallest reversible slice.

## Alternatives considered

- Rebuild the rail DOM: rejected because it risks keyboard order, calendar clearance, and section anchoring.
- Replace hand-drawn assets: rejected because the current assets are already the approved family.
- Redesign the full home page: rejected because the user identified the right-rail hierarchy specifically.
