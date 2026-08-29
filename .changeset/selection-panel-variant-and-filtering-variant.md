---
'@ez-kit/data-grid-react': minor
---

Align `SelectionPanelVariant` with the repo's closed-set convention and resolve `filtering.variant` to its documented default.

`SelectionPanelVariant` is now a PascalCase `const` object plus a same-named union derived from it — the shape every other closed set in these packages already uses (`PaginationVariant`, `RowActionsMode`, `ColumnAlign`, …) — and it is exported from the package root. `SelectionBarProps.variant` and `DraftBarProps.variant` reference it instead of re-spelling `'floating' | 'inline'`. The internal `SELECTION_PANEL_VARIANT` const is gone; the bare strings stay valid, so no consumer has to import anything.

`filtering.variant` now falls back to `DATA_GRID_DEFAULTS.filtering.variant` (`'inline'`) during resolution, and `ResolvedGridOptions.filtering.variant` is required. Previously `useGridOptions().filtering.variant` returned `undefined` unless the option was set explicitly, so a custom header switching on it hit no branch.
