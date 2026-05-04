# @ez-kit/data-grid-react — Feature Plan

> React adapter layer. Consumes `@ez-kit/data-grid-core` and renders UI.
> Everything here is React-specific: components, hooks, DI system, compound API.

---

## Legend

- ✅ Done
- 🚧 In progress
- 🔲 Planned

---

## Core Compound Component

| Feature                           | Status | Notes |
| --------------------------------- | ------ | ----- |
| `<DataGrid table={table} />` root | ✅     |       |
| `useDataGrid(config)` hook        | ✅     |       |
| Custom layout via `children`      | ✅     |       |
| Component DI (`GridComponents`)   | ✅     |       |
| `CellTypeRegistry`                | ✅     |       |

---

## CRUD UI

| Feature                                      | Status | Notes                                                                                                                                                          |
| -------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline row editing (row mode)                | ✅     |                                                                                                                                                                |
| Modal editing                                | ✅     |                                                                                                                                                                |
| Cell-click editing (cell mode)               | ✅     |                                                                                                                                                                |
| Inline row creating (row mode)               | ✅     |                                                                                                                                                                |
| Modal creating                               | ✅     |                                                                                                                                                                |
| Pin-row creating                             | ✅     |                                                                                                                                                                |
| Row delete button                            | ✅     |                                                                                                                                                                |
| `AutoForm` label uses column `header` string | 🔲     | Currently falls back to `col.id`                                                                                                                               |
| Delete confirmation dialog                   | ✅     | Optional confirm step before `onDelete` fires; `confirmation: boolean \| ConfirmationOptions` in `deleting` config; state in core; shadcn `AlertDialog` via DI |
| Bulk delete (multi-select)                   | ✅     | Via `selectionBar.onDelete`; consumer receives selected rows and decides how to delete                                                                         |

---

## Filtering

### Filter display variant

Controlled at `<DataGrid>` level via `filtering.variant`.

| Variant   | Status | Notes                                                                                                                |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `inline`  | ✅     | Input rendered directly below column header — current default                                                        |
| `popover` | ✅     | Filter icon in column header; click opens popover with filter input + operators; `filtering: { variant: 'popover' }` |
| `panel`   | 🔲     | All column filters rendered as a list above/below the table, outside the header row                                  |

### Filter operators UI

When a column has `operators` enabled, a trigger appears next to the filter input letting the user pick the active operator.

| Feature                             | Status | Notes                                                                                    |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Operator selector UI per column     | ✅     | `OperatorSelect` DI component rendered in inline and popover variants                    |
| `between` operator — min/max inputs | ✅     | `BetweenInput` DI component receives `{ from, to }` when operator is `between`           |
| `between` operator — range slider   | 🚧     | Supported by `BetweenInput` variant and shadcn block; HeroUI block currently uses inputs |

### Filter extras

| Feature                  | Status | Notes                                                               |
| ------------------------ | ------ | ------------------------------------------------------------------- |
| Active filter chips      | 🔲     | Strip above the table showing each active filter as a removable tag |
| Clear all filters button | 🔲     | Single action to reset all active filters at once                   |
| Quick filter chips       | 🔲     | Predefined filter presets rendered as clickable pill buttons        |
| Saved filter presets UI  | 🔲     | Save / load / delete named filter+sort+visibility presets           |

---

## Header & Columns

| Feature                                    | Status | Notes                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sort indicators                            | ✅     |                                                                                                                                                                                                                                                  |
| Per-column filter input (`inline` variant) | ✅     |                                                                                                                                                                                                                                                  |
| Column pinning (sticky)                    | ✅     | `ColumnMenu` DI component; pin left / right / unpin dropdown per header; `pinning: { column: true }` on config; shadcn styled block with `DropdownMenu` + `EllipsisVertical` trigger; header-main flex row keeps sort trigger + menu in one line |
| `aria-sort` attribute on `<th>`            | 🔲     | Accessibility                                                                                                                                                                                                                                    |
| Column resize handle                       | ✅     | `Resizer` DI component; CSS-variable widths; shadcn styled block (`w-[2px] bg-primary rounded-full`)                                                                                                                                             |
| Column visibility menu                     | ✅     | Toolbar `ColumnVisibilityMenu` popover + "Hide" in `ColumnMenu`; `visibility: false` locks column; `visibility: { defaultHidden: true }` starts hidden; enabled via `columnVisibility: { toolbar: true }`                                        |
| Column reorder via drag                    | 🔲     | Drag header cell to reorder columns                                                                                                                                                                                                              |

---

## Toolbar

| Feature                            | Status | Notes                                                                                                       |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Default toolbar with Create button | ✅     |                                                                                                             |
| Global search input                | 🔲     | Search input wired to global filter; shown when `filtering.global` is enabled                               |
| Column visibility toggle button    | ✅     | `DataGrid.ColumnVisibilityTrigger`; toolbar renders it when `columnVisibility: true` or `{ toolbar: true }` |
| Bulk actions bar                   | ✅     | `DataGrid.SelectionBar`; shows selected count, optional delete, clear, and custom `actions` slot            |
| Export button                      | 🔲     | Triggers CSV or JSON export                                                                                 |
| Row density toggle                 | 🔲     | Switch between `compact` / `comfortable` / `spacious` row padding                                           |
| Fullscreen toggle                  | 🔲     | Expand grid to fill viewport                                                                                |

---

## Rows

| Feature                    | Status | Notes                                                                                         |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Row expand toggle          | ✅     |                                                                                               |
| Sub-row render slot        | ✅     |                                                                                               |
| Row selection checkbox     | ✅     |                                                                                               |
| Row detail / drawer        | 🔲     | Expand a row to reveal a full-width detail panel (not a sub-row)                              |
| Row drag handle (reorder)  | 🔲     | Visual handle column; ties into core `moveRow`                                                |
| Row pinning (top / bottom) | ✅     | `RowPinMenu` DI component; top / bottom pinned rows render with sticky positioning            |
| Virtualized rows           | ✅     | `virtualized` config uses `@tanstack/react-virtual`; default height via `--dg-virtual-height` |
| Conditional row styling    | 🔲     | `getRowClassName(row)` / `getRowStyle(row)` on DataGrid config                                |
| Row highlight by id        | 🔲     | Visually highlight a specific row (e.g. after create/navigate)                                |
| `onRowClick` handler       | 🔲     | Callback fired when a data row is clicked                                                     |
| Row context menu           | 🔲     | Right-click on row opens a custom context menu                                                |
| Striped rows               | 🔲     | Alternating row background via config flag                                                    |
| Selection info bar         | ✅     | `SelectionBar` DI component shown when row selection is active                                |

---

## Cells

| Feature                                                                              | Status | Notes                                                                    |
| ------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| Built-in type renderers (text, number, date, boolean)                                | ✅     |                                                                          |
| Custom `cell.component` per column                                                   | ✅     |                                                                          |
| Custom `editing.component` / `creating.component` / `filtering.component` per column | ✅     |                                                                          |
| `select` cell type (enum dropdown)                                                   | ✅     | View + edit + filter rendering in shadcn and HeroUI registries           |
| `badge` / `tag` cell type                                                            | ✅     | Colored pill; config maps values to label + variant in shadcn and HeroUI |
| `image` cell type                                                                    | ✅     | Thumbnail view + URL input in shadcn and HeroUI                          |
| `link` cell type                                                                     | ✅     | Anchor/button-style view + URL input in shadcn and HeroUI                |
| `currency` cell type                                                                 | 🔲     | Locale-formatted number with currency symbol                             |
| `progress` cell type                                                                 | ✅     | Progress bar view + numeric input in shadcn and HeroUI                   |
| Cell tooltip on text overflow                                                        | 🔲     | Show full value in tooltip when content is truncated                     |
| Copy cell value to clipboard                                                         | 🔲     | Via click or keyboard shortcut                                           |
| Search highlight in cells                                                            | 🔲     | Highlight matching text when global search is active                     |

---

## Empty & Loading States

| Feature               | Status | Notes                                                            |
| --------------------- | ------ | ---------------------------------------------------------------- |
| Loading skeleton rows | ✅     | `fallbacks.loading`; `LoadingRow` DI slot; shadcn Skeleton + heroui Skeleton blocks |
| Empty state           | ✅     | `fallbacks.empty`; `EmptyState` DI slot; shadcn + heroui blocks  |
| "No results" state    | ✅     | `fallbacks.noResults`; `NoResultsState` DI slot; shadcn + heroui blocks             |

---

## Pagination

| Feature                            | Status | Notes                    |
| ---------------------------------- | ------ | ------------------------ |
| Prev / Next / First / Last buttons | ✅     |                          |
| Page size selector                 | ✅     |                          |
| Jump-to-page input                 | 🔲     | Direct page number input |

---

## Accessibility

| Feature                                     | Status | Notes                          |
| ------------------------------------------- | ------ | ------------------------------ |
| Sort keyboard navigation (Enter / Space)    | ✅     |                                |
| `aria-sort` on `<th>`                       | 🔲     |                                |
| `role="grid"` on table element              | 🔲     |                                |
| Arrow-key row / cell navigation             | 🔲     |                                |
| Screen-reader live region for state changes | 🔲     | Announce sort / filter changes |

---

## Developer Experience

| Feature                                  | Status | Notes                                                         |
| ---------------------------------------- | ------ | ------------------------------------------------------------- |
| `useDataGridState(table, selector)` hook | 🔲     | Subscribe to a slice of state to avoid unnecessary re-renders |
| Storybook / sandbox stories per feature  | 🔲     |                                                               |

---

## Notes

- `filtering.variant` is a `<DataGrid>`-level prop, not per-column config.
- The `panel` variant renders filters outside the table — layout is up to the consumer using the compound pattern.
- Compound pattern (`<DataGrid.FilterPanel />` etc.) is the escape hatch for custom placements like sidebars or sheets.
- New cell types live in `built-in-cell-types.tsx`.
- New compound sub-components get attached to `DataGrid.*` in `data-grid.tsx`.
