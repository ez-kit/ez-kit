---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-native': minor
---

Settle the data-grid public API so it stops moving. Breaking, pre-1.0 so shipped as a minor.

**One vocabulary for options.**

- Column `visibility` flips from `true | { … }` to `false | { … }` — `false` now turns hiding
  off for that column, matching every other per-column switch (`sorting`, `filtering`,
  `editing`, `resizing`).
- Column `globalFilter` becomes `globalFiltering?: false`, and the table option `sizing` /
  `SizingConfig` becomes `resizing` / `ResizingConfig`. Names now match across levels.
- `editing.variant` and `creating.variant` become `mode` (`EditingVariant` / `CreatingVariant`
  → `EditingMode` / `CreatingMode`). The rule from here: `mode` changes behaviour, `variant`
  changes layout only — so `rowActions`, `filtering`, `pagination` and `selection.panel` keep
  `variant`.
- Every feature option reads the same way: `false`/omitted is off, `true` is on with defaults,
  an object is on **and** configured. New `enabled: false` keeps the settings while switching
  the feature off — what a shared defaults layer needs.
- `toolbar` is the single word for auto-mounting a feature's control.
  `filtering.clearButton` → `filtering.toolbar` (`FilterClearButtonConfig` →
  `FilteringToolbarConfig`), and `pagination.toolbar` is new — `pageSizeOptions` is data again
  rather than a hidden switch. Omitting it preserves the current one-field behaviour.
- `filtering.debounce` is the shared timing for every text filter and defaults to `250` (was
  `0`); `globalFiltering.debounce` falls back to it instead of carrying a second default.

**Types and exports.**

- `ReactExpandingConfig` collapses to `ExpandingConfig<TRow, ComponentType<…>>` — it was the
  one React config restated by hand, so the one guaranteed to drift.
- `shadcn` and `heroui` now export their own `createColumns` / `createColumnHelper`. They were
  falling through to the headless versions, typed `TCustomCellTypes = never`, which compiled
  while silently not checking a column's custom `cell: { type: … }`.
- New `useGridOptions()` and `ResolvedGridOptions`: the grid's resolved decisions — filter
  variant, debounce, which controls auto-mount — are now readable by a UI kit or a custom
  compound child, instead of living behind eighteen private `Symbol()` keys.

**Composition.**

- `<DataGrid.Footer />` renders a `<tfoot>` from each column's `footer`. Not in the default
  layout; place it inside a custom `<DataGrid.Table>` body.
- `<DataGrid.Header>` accepts `children` (element or render function), so a custom header row
  no longer costs pinning, sticky positioning and virtualization.
- `Tfoot` joins the core UI-kit contract — breaking for an external kit registered with
  `satisfies FullGridComponents`.
