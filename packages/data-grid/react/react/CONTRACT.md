# UI-kit contract

`@ez-kit/data-grid-react` is **headless**: it ships zero visual styling and renders
every visible primitive through a dependency-injection registry. To bring the grid to
your own UI kit you implement a set of React components and register them once.

This document is the reference for that contract. The types referenced here
(`GridComponents`, `FullGridComponents`, each `*Props`) are all exported from the
package's public entry point.

## The three obligations

Every kit owes exactly three things:

1. **Register components.** Pass a nested, feature-grouped object to the factory:

   ```ts
   import { createDataGrid } from '@ez-kit/data-grid-react'
   import type { FullGridComponents } from '@ez-kit/data-grid-react'

   const components = {
   	core: { Table, Thead, Tbody, Tfoot, Tr, Th, Td, Button, Input, Checkbox, Toolbar, Menu, NumberInput, Modal },
   	pagination: { Pagination, PageSizer },
   	sorting: { SortIndicator, SortMenu },
   	// …one group per feature (see the tables below)
   } satisfies FullGridComponents

   export const { DataGrid, useDataGrid, extendDataGrid } = createDataGrid({ components })
   ```

   The group keys are the feature names, spelled exactly as the options are — `core`,
   `pagination`, `sorting`, `filtering`, `editing`, `deleting`,
   `rowActions`, `resizing`, `visibility`, `fallbacks`, `infinite`, `expanding`. A partial kit
   may omit whole groups or individual members (type it `satisfies GridComponents`); overrides
   are merged group-by-group.

2. **Apply the structural CSS once** at the kit or app root:

   ```ts
   import '@ez-kit/data-grid-react/styles.css'
   ```

   This stylesheet is **structural only** — positioning, layout, overflow, z-index,
   cursor, and the pinning offsets. All _visual_ styling (color, borders, spacing,
   typography, hover/focus, motion) is yours: target the `data-slot` hooks the react
   layer emits (see [Structural `data-slot` hooks](#structural-data-slot-hooks)).

3. **Write no user-facing text.** Every string the grid renders — visible labels,
   `placeholder`s and `aria-label`s alike — lives in one dictionary, so a consumer can
   replace any of it through `messages`. A kit reads it and holds no literal of its own:

   ```tsx
   import { useGridMessages } from '@ez-kit/data-grid-react'

   export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
   	const messages = useGridMessages()
   	return <span>{messages.pagination.rowsPerPage}</span>
   }
   ```

   `useGridMessages()` returns the complete `GridMessages` — the English defaults with the
   grid's `messages` folded on — so no call site needs a fallback. Outside a `<DataGrid>` it
   returns `defaultMessages` rather than throwing, so a block still renders in a story or a
   test. Entries whose text depends on the render are functions with a typed context:
   `messages.filtering.placeholder({ columnId })`, `messages.selection.count({ count })`.

   The in-repo kits enforce this with an ESLint rule that fails on a JSX-text or
   `aria-label` / `placeholder` / `title` literal — and on a module constant named
   `*_LABEL` / `*_TEXT` / `*_TITLE` / `*_PLACEHOLDER`, which is how the first sweep leaked.
   A kit outside this repo is on its honour, but the same reasoning applies: a grid that is
   90% localizable is not localizable, and the English that leaks is usually an `aria-label`,
   invisible until a screen reader reads it in the wrong language.

## Full vs partial support

- **`satisfies FullGridComponents`** — the kit advertises full support. A forgotten
  component is a **compile error**. This is what the in-repo `shadcn` and `heroui` kits
  use. Recommended.
- **`satisfies GridComponents`** — a partial kit that implements a subset. Legal, but
  any feature that references a missing component fails at runtime. In development the
  grid throws a named error (see [Dev-time guard](#dev-time-guard)) instead of React's
  opaque "undefined is not a component".

Opt into individual feature groups with the tier types
(`GridCoreComponents`, `GridPaginationComponents`, `GridSortingComponents`,
`GridFilteringComponents`, `GridEditingComponents`, `GridDeletingComponents`,
`GridSelectionComponents`, `GridDraftComponents`, `GridRowActionsComponents`,
`GridResizingComponents`, `GridVisibilityComponents`, `GridFallbackComponents`,
`GridInfiniteComponents`, `GridExpandingComponents`).

All of these — plus the flat `COMPONENT_FEATURE` lookup — are derived from a single
exported map, `FEATURE_COMPONENTS: Record<GridFeature, readonly (keyof GridComponentRegistry)[]>`,
so "which feature owns which component" is defined in exactly one place.

## Recommended kit structure

The in-repo kits (`shadcn`, `heroui`) organize their components into one folder
per feature, mirroring `FEATURE_COMPONENTS` so the file tree reads like the contract:

```
src/blocks/
  core/  pagination/  sorting/  filtering/  editing/  action-bar/
  row-actions/  resizing/  visibility/  fallbacks/  infinite/  expanding/  cell-types/
```

Two folders do not correspond to a group one-for-one: `deleting` owns a single component and
its file sits in `editing/` beside the forms it belongs with, and `cell-types/` is not a
contract group at all — it is the kit's own cell-type registry, the second extension axis.

This is a convention, not a requirement — the factory only cares about the registered
component object — but it keeps a kit discoverable as it grows.

## Components by feature

Every component is optional in `GridComponents`; the **Feature** column (from the
`COMPONENT_FEATURE` map) tells you which feature makes it required. Props types are
exported — read them for the exact shape.

### `core` — always required to render a grid

| Component     | Props              | Notes                                                               |
| ------------- | ------------------ | ------------------------------------------------------------------- |
| `Table`       | `TableProps`       | Table root. Emits `data-slot="table"`.                              |
| `Thead`       | `TheadProps`       | Emits `data-slot="thead"`.                                          |
| `Tbody`       | `TbodyProps`       | Emits `data-slot="tbody"`.                                          |
| `Tr`          | `TrProps`          | Emits `data-slot="tr"`.                                             |
| `Th`          | `ThProps`          | `pinned?: 'left' \| 'right' \| false`. Emits `data-slot="th"`.      |
| `Td`          | `TdProps`          | `pinned?: 'left' \| 'right' \| false`. Emits `data-slot="td"`.      |
| `Button`      | `ButtonProps`      | Generic button used by triggers/actions.                            |
| `Input`       | `InputProps`       | Generic text input.                                                 |
| `Checkbox`    | `CheckboxProps`    | Row/all selection. `indeterminate`, `onChange(checked)`.            |
| `Tfoot`       | `TfootProps`       | Emits `data-slot="tfoot"`.                                          |
| `Toolbar`     | `ToolbarProps`     | Chrome around search/actions. `start` / `end` / `children`.         |
| `Menu`        | `GridMenuProps`    | The one overflow menu: `sections` of icon/label entries, `variant`. |
| `NumberInput` | `NumberInputProps` | A primitive, beside `Input` — the number filter reaches for it too. |
| `ActionBar`   | `ActionBarProps`   | One bar, a `selection` and a `draft` section, both live.            |
| `Modal`       | `ModalProps`       | Generic dialog shell. Any feature needing a dialog uses this.       |

### `pagination`

| Component    | Props             |
| ------------ | ----------------- |
| `Pagination` | `PaginationProps` |
| `PageSizer`  | `PageSizerProps`  |

### `sorting`

| Component       | Props                |
| --------------- | -------------------- |
| `SortIndicator` | `SortIndicatorProps` |
| `SortMenu`      | `SortMenuProps`      |

### `filtering`

| Component           | Props                                                  |
| ------------------- | ------------------------------------------------------ |
| `FilterPopover`     | `FilterPopoverProps`                                   |
| `FilterPanel`       | `FilterPanelProps`                                     |
| `FilterPanelChip`   | `FilterPanelChipProps`                                 |
| `FilterChip`        | `FilterChipProps`                                      |
| `ClearFilterButton` | `ClearFilterButtonProps`                               |
| `GlobalFilterInput` | `GlobalFilterInputProps` (debounce applied upstream)   |
| `OperatorSelect`    | `OperatorSelectProps`                                  |
| `BetweenInput`      | `BetweenInputProps` (`inputs` / `slider` / `calendar`) |
| `MultiSelectFilter` | `MultiSelectFilterProps`                               |

### `editing`

| Component   | Props                                             |
| ----------- | ------------------------------------------------- |
| `FormShell` | `FormShellProps` (creating / editing modal shell) |

One shell serves both write forms — creating and editing are one `DataGridFormModalProps` — and
the dialog it renders into is `core.Modal`.

### `deleting`

| Component       | Props                                      |
| --------------- | ------------------------------------------ |
| `ConfirmDialog` | `ConfirmDialogProps` (delete confirmation) |

### `rowActions`

Per-row actions share one column: edit / delete buttons plus the row-pin menu.

| Component     | Props              |
| ------------- | ------------------ |
| `ActionsCell` | `ActionsCellProps` |

The menu half is **not** a slot of its own — the entries go through `core.Menu` with
`variant: 'row'`, the same component the column header opens with `variant: 'column'`. Under the
default `rowActions.placement: 'inline'` that menu holds the pin entries and any custom entry
that did not ask to be a button; under `'menu'` it holds every action.

`ActionsCellProps` is a discriminated union over the three states a row can be in (`idle`,
`editing`, `creating`), so each state carries exactly the callbacks it can use. In `idle` the
cell also receives `actions` — the custom entries that asked for `placement: 'inline'`, already
resolved to the menu model. A kit renders each as an icon button beside its own Edit and Delete,
and a `GridMenuItemSlot` entry as its bare `component`.

### `resizing`

| Component | Props          |
| --------- | -------------- |
| `Resizer` | `ResizerProps` |

### `visibility`

| Component        | Props                 |
| ---------------- | --------------------- |
| `VisibilityMenu` | `VisibilityMenuProps` |

### `fallbacks`

| Component        | Props                 |
| ---------------- | --------------------- |
| `LoadingRow`     | `LoadingRowProps`     |
| `EmptyState`     | `EmptyStateProps`     |
| `NoResultsState` | `NoResultsStateProps` |
| `RefetchOverlay` | `RefetchOverlayProps` |

### `infinite`

| Component     | Props              |
| ------------- | ------------------ |
| `LoadMoreRow` | `LoadMoreRowProps` |

### `expanding`

| Component | Props          |
| --------- | -------------- |
| `Chevron` | `ChevronProps` |

## Structural `data-slot` hooks

The react layer tags its structural host elements with `data-slot` attributes. Your
kit's CSS targets these; the react package never sets a color, border, or spacing on
them. Slots currently emitted:

```
table                    table-wrapper             table-scroll
table-scroll-container   table-row                 thead
tbody                    tfoot                     tr
th                       td                        toolbar
header-main              header-extras             sort-trigger
column-resizer           pin-shadow-overlay        create-trigger
global-filter-input      filter                    filter-chip
filter-panel             filter-panel-chrome       filter-panel-chip
filter-panel-chip-value  active-filters-bar        clear-filter-button
between-presets          auto-form                 auto-form-field
creating-save            creating-cancel           row-action
action-bar               action-bar-selection      action-bar-draft
action-bar-draft-part    action-bar-action         action-bar-close
action-bar-reset         action-bar-apply          count
bottom-bar
loading-body-cell        empty-state-cell          no-results-cell
refetch-overlay          refetch-overlay-inner     load-more-row
load-more-button         load-more-spinner         load-more-error
```

Kits may add their own `data-slot`/`data-*` attributes inside their components; the
react package only owns the structural ones above.

## Dev-time guard

When a grid mounts in development (`process.env.NODE_ENV !== 'production'`), a guard
verifies the components required for the _current_ configuration are registered. If any
are missing it throws, e.g.:

```
[data-grid] Missing required UI-kit component(s):
  - Table (core)
  - ConfirmDialog (deleting)
Register them via createDataGrid({ components }) or a local <DataGrid components={{…}} /> override.
```

The guard is conservative — it asserts only the always-rendered structural primitives
plus components gated by a config that is definitively present (delete confirmation,
modal creating/editing, the action bar) — so it never fires a false positive. It is
stripped from production builds. For full compile-time coverage, use
`satisfies FullGridComponents`.
