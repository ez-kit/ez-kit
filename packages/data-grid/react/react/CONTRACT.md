# UI-kit contract

`@ez-kit/data-grid-react` is **headless**: it ships zero visual styling and renders
every visible primitive through a dependency-injection registry. To bring the grid to
your own UI kit you implement a set of React components and register them once.

This document is the reference for that contract. The types referenced here
(`GridComponents`, `FullGridComponents`, each `*Props`) are all exported from the
package's public entry point.

## The two obligations

Every kit owes exactly two things:

1. **Register components.** Pass a nested, feature-grouped object to the factory:

   ```ts
   import { createDataGrid } from '@ez-kit/data-grid-react'
   import type { FullGridComponents } from '@ez-kit/data-grid-react'

   const components = {
     core: { Table, Thead, Tbody, Tr, Th, Td, Button, Input, Checkbox, Toolbar },
     pagination: { Pagination, PageSizer },
     sorting: { SortIndicator, SortMenu, ColumnMenu },
     // …one group per feature (see the tables below)
   } satisfies FullGridComponents

   export const { DataGrid, useDataGrid, extendDataGrid } = createDataGrid({ components })
   ```

   The group keys are the feature names (`core`, `pagination`, `'column-visibility'`,
   `'fallback-states'`, …). A partial kit may omit whole groups or individual members
   (type it `satisfies GridComponents`); overrides are merged group-by-group.

2. **Apply the structural CSS once** at the kit or app root:

   ```ts
   import '@ez-kit/data-grid-react/styles.css'
   ```

   This stylesheet is **structural only** — positioning, layout, overflow, z-index,
   cursor, and the pinning offsets. All *visual* styling (color, borders, spacing,
   typography, hover/focus, motion) is yours: target the `data-slot` hooks the react
   layer emits (see [Structural `data-slot` hooks](#structural-data-slot-hooks)).

## Full vs partial support

- **`satisfies FullGridComponents`** — the kit advertises full support. A forgotten
  component is a **compile error**. This is what the in-repo `shadcn`, `heroui`, and
  `native` kits use. Recommended.
- **`satisfies GridComponents`** — a partial kit that implements a subset. Legal, but
  any feature that references a missing component fails at runtime. In development the
  grid throws a named error (see [Dev-time guard](#dev-time-guard)) instead of React's
  opaque "undefined is not a component".

Opt into individual feature groups with the tier types
(`GridCoreComponents`, `GridPaginationComponents`, `GridSortingComponents`,
`GridFilteringComponents`, `GridEditingComponents`, `GridSelectionComponents`,
`GridPinningComponents`, `GridResizingComponents`, `GridColumnVisibilityComponents`,
`GridFallbackStateComponents`, `GridInfiniteComponents`, `GridExpandingComponents`).

All of these — plus the flat `COMPONENT_FEATURE` lookup — are derived from a single
exported map, `FEATURE_COMPONENTS: Record<GridFeature, readonly (keyof GridComponents)[]>`,
so "which feature owns which component" is defined in exactly one place.

## Recommended kit structure

The in-repo kits (`shadcn`, `heroui`, `native`) organize their components into one folder
per feature, mirroring `FEATURE_COMPONENTS` so the file tree reads like the contract:

```
src/blocks/
  core/  pagination/  sorting/  filtering/  editing/  selection/
  pinning/  resizing/  column-visibility/  fallback-states/  infinite/  expanding/
```

This is a convention, not a requirement — the factory only cares about the registered
component object — but it keeps a kit discoverable as it grows.

## Components by feature

Every component is optional in `GridComponents`; the **Feature** column (from the
`COMPONENT_FEATURE` map) tells you which feature makes it required. Props types are
exported — read them for the exact shape.

### `core` — always required to render a grid

| Component | Props | Notes |
|-----------|-------|-------|
| `Table`   | `TableProps`   | Table root. Emits `data-slot="table"`. |
| `Thead`   | `TheadProps`   | Emits `data-slot="thead"`. |
| `Tbody`   | `TbodyProps`   | Emits `data-slot="tbody"`. |
| `Tr`      | `TrProps`      | Emits `data-slot="tr"`. |
| `Th`      | `ThProps`      | `pinned?: 'left' \| 'right' \| false`. Emits `data-slot="th"`. |
| `Td`      | `TdProps`      | `pinned?: 'left' \| 'right' \| false`. Emits `data-slot="td"`. |
| `Button`  | `ButtonProps`  | Generic button used by triggers/actions. |
| `Input`   | `InputProps`   | Generic text input. |
| `Checkbox`| `CheckboxProps`| Row/all selection. `indeterminate`, `onChange(checked)`. |
| `Toolbar` | `ToolbarProps` | Chrome around search/actions. `left` / `right` / `children`. |

### `pagination`

| Component | Props |
|-----------|-------|
| `Pagination` | `PaginationProps` |
| `PageSizer`  | `PageSizerProps` |

### `sorting`

| Component | Props |
|-----------|-------|
| `SortIndicator` | `SortIndicatorProps` |
| `SortMenu`      | `SortMenuProps` |
| `ColumnMenu`    | `ColumnMenuProps` (pin / visibility / sorting sections) |

### `filtering`

| Component | Props |
|-----------|-------|
| `FilterPopover`      | `FilterPopoverProps` |
| `FilterPanel`        | `FilterPanelProps` |
| `FilterPanelChip`    | `FilterPanelChipProps` |
| `FilterChip`         | `FilterChipProps` |
| `ClearFiltersButton` | `ClearFiltersButtonComponentProps` |
| `GlobalFilterInput`  | `GlobalFilterInputProps` (debounce applied upstream) |
| `OperatorSelect`     | `OperatorSelectProps` |
| `BetweenInput`       | `BetweenInputProps` (`inputs` / `slider` / `calendar`) |
| `MultiSelectFilter`  | `MultiSelectFilterProps` |

### `editing`

| Component | Props |
|-----------|-------|
| `Modal`               | `ModalProps` |
| `FormShell`           | `FormShellProps` (creating / editing modal shell) |
| `ActionsCell`         | `ActionsCellProps` |
| `CreatingActionsCell` | `CreatingActionsCellProps` |
| `ConfirmDialog`       | `ConfirmDialogProps` (delete confirmation) |
| `NumberInput`         | `NumberInputProps` |

### `selection`

| Component | Props |
|-----------|-------|
| `SelectionBar` | `SelectionBarProps` (`floating` / `inline`) |

### `pinning` / `resizing`

| Component | Props | Feature |
|-----------|-------|---------|
| `RowPinMenu` | `RowPinMenuProps` | `pinning` |
| `Resizer`    | `ResizerProps`    | `resizing` |

### `column-visibility`

| Component | Props |
|-----------|-------|
| `ColumnVisibilityMenu` | `ColumnVisibilityMenuProps` |

### `fallback-states`

| Component | Props |
|-----------|-------|
| `LoadingRow`     | `LoadingRowProps` |
| `EmptyState`     | `EmptyStateProps` |
| `NoResultsState` | `NoResultsStateProps` |
| `RefetchOverlay` | `RefetchOverlayProps` |

### `infinite`

| Component | Props |
|-----------|-------|
| `LoadMoreRow` | `LoadMoreRowProps` |

### `expanding`

| Component | Props |
|-----------|-------|
| `Chevron` | `ChevronProps` |

## Structural `data-slot` hooks

The react layer tags its structural host elements with `data-slot` attributes. Your
kit's CSS targets these; the react package never sets a color, border, or spacing on
them. Slots currently emitted:

```
table                     table-wrapper           table-scroll
table-scroll-container     thead                   tbody
tr                         th                      td
toolbar                    header-main             header-extras
sort-trigger               create-trigger          global-filter-input
filter-panel               active-filters-bar      pin-shadow-overlay
load-more-row              loading-body-cell
```

Kits may add their own `data-slot`/`data-*` attributes inside their components; the
react package only owns the structural ones above.

## Dev-time guard

When a grid mounts in development (`process.env.NODE_ENV !== 'production'`), a guard
verifies the components required for the *current* configuration are registered. If any
are missing it throws, e.g.:

```
[data-grid] Missing required UI-kit component(s):
  - Table (core)
  - ConfirmDialog (editing)
Register them via createDataGrid({ components }) or a local <DataGrid components={{…}} /> override.
```

The guard is conservative — it asserts only the always-rendered structural primitives
plus components gated by a config that is definitively present (delete confirmation,
modal creating/editing, selection bar) — so it never fires a false positive. It is
stripped from production builds. For full compile-time coverage, use
`satisfies FullGridComponents`.
