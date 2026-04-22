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

| Feature | Status | Notes |
|---------|--------|-------|
| `<DataGrid table={table} />` root | ✅ | |
| `useDataGrid(config)` hook | ✅ | |
| Custom layout via `children` | ✅ | |
| Component DI (`GridComponents`) | ✅ | |
| `CellTypeRegistry` | ✅ | |

---

## CRUD UI

| Feature | Status | Notes |
|---------|--------|-------|
| Inline row editing (row mode) | ✅ | |
| Modal editing | ✅ | |
| Cell-click editing (cell mode) | ✅ | |
| Inline row creating (row mode) | ✅ | |
| Modal creating | ✅ | |
| Pin-row creating | ✅ | |
| Row delete button | ✅ | |
| `AutoForm` label uses column `header` string | 🔲 | Currently falls back to `col.id` |
| Delete confirmation dialog | ✅ | Optional confirm step before `onDelete` fires; `confirmation: boolean \| ConfirmationOptions` in `deleting` config; state in core; shadcn `AlertDialog` via DI |
| Bulk delete (multi-select) | 🔲 | Part of bulk actions bar — see Toolbar section |

---

## Filtering

### Filter display variant
Controlled at `<DataGrid>` level via `filtering.variant`.

| Variant | Status | Notes |
|---------|--------|-------|
| `inline` | ✅ | Input rendered directly below column header — current default |
| `popover` | 🔲 | Filter icon appears in column header; click opens a popover with the filter input |
| `panel` | 🔲 | All column filters rendered as a list above/below the table, outside the header row |

### Filter operators UI
When a column has `operators` enabled, a trigger appears next to the filter input letting the user pick the active operator.

| Feature | Status | Notes |
|---------|--------|-------|
| Operator selector UI per column | 🔲 | Rendered in whatever filter display variant is active |
| `between` operator — min/max inputs | 🔲 | Two separate inputs when operator is `between` |
| `between` operator — range slider | 🔲 | Alternative to min/max inputs for numeric ranges |

### Filter extras

| Feature | Status | Notes |
|---------|--------|-------|
| Active filter chips | 🔲 | Strip above the table showing each active filter as a removable tag |
| Clear all filters button | 🔲 | Single action to reset all active filters at once |
| Quick filter chips | 🔲 | Predefined filter presets rendered as clickable pill buttons |
| Saved filter presets UI | 🔲 | Save / load / delete named filter+sort+visibility presets |

---

## Header & Columns

| Feature | Status | Notes |
|---------|--------|-------|
| Sort indicators | ✅ | |
| Per-column filter input (`inline` variant) | ✅ | |
| Column pinning (sticky) | ✅ | `ColumnMenu` DI component; pin left / right / unpin dropdown per header; `pinning: { column: true }` on config; shadcn styled block with `DropdownMenu` + `EllipsisVertical` trigger; header-main flex row keeps sort trigger + menu in one line |
| `aria-sort` attribute on `<th>` | 🔲 | Accessibility |
| Column resize handle | ✅ | `Resizer` DI component; CSS-variable widths; shadcn styled block (`w-[2px] bg-primary rounded-full`) |
| Column visibility menu | ✅ | Toolbar `ColumnVisibilityMenu` popover + "Hide" in `ColumnMenu`; `visibility: false` locks column; `visibility: { defaultHidden: true }` starts hidden; enabled via `columnVisibility: { toolbar: true }` |
| Column reorder via drag | 🔲 | Drag header cell to reorder columns |

---

## Toolbar

| Feature | Status | Notes |
|---------|--------|-------|
| Default toolbar with Create button | ✅ | |
| Global search input | 🔲 | Search input wired to global filter; shown when `filtering.global` is enabled |
| Column visibility toggle button | 🔲 | Opens column visibility menu |
| Bulk actions bar | 🔲 | Replaces or extends toolbar when rows are selected; slot-based for custom actions |
| Export button | 🔲 | Triggers CSV or JSON export |
| Row density toggle | 🔲 | Switch between `compact` / `comfortable` / `spacious` row padding |
| Fullscreen toggle | 🔲 | Expand grid to fill viewport |

---

## Rows

| Feature | Status | Notes |
|---------|--------|-------|
| Row expand toggle | ✅ | |
| Sub-row render slot | ✅ | |
| Row selection checkbox | ✅ | |
| Row detail / drawer | 🔲 | Expand a row to reveal a full-width detail panel (not a sub-row) |
| Row drag handle (reorder) | 🔲 | Visual handle column; ties into core `moveRow` |
| Row pinning (top / bottom) | 🔲 | Pinned rows rendered in separate sticky sections |
| Virtualized rows | 🔲 | Body renders only visible rows for large datasets |
| Conditional row styling | 🔲 | `getRowClassName(row)` / `getRowStyle(row)` on DataGrid config |
| Row highlight by id | 🔲 | Visually highlight a specific row (e.g. after create/navigate) |
| `onRowClick` handler | 🔲 | Callback fired when a data row is clicked |
| Row context menu | 🔲 | Right-click on row opens a custom context menu |
| Striped rows | 🔲 | Alternating row background via config flag |
| Selection info bar | 🔲 | "N of M rows selected" summary; shown when selection is active |

---

## Cells

| Feature | Status | Notes |
|---------|--------|-------|
| Built-in type renderers (text, number, date, boolean) | ✅ | |
| Custom `cell.component` per column | ✅ | |
| Custom `editing.component` / `creating.component` / `filtering.component` per column | ✅ | |
| `select` cell type (enum dropdown) | 🔲 | View + edit + filter rendering for enum values |
| `badge` / `tag` cell type | 🔲 | Colored pill; config maps values to label + color |
| `image` cell type | 🔲 | Renders thumbnail |
| `link` cell type | 🔲 | Renders anchor; `href` derived from row data |
| `currency` cell type | 🔲 | Locale-formatted number with currency symbol |
| `progress` cell type | 🔲 | Progress bar for 0–100 numeric values |
| Cell tooltip on text overflow | 🔲 | Show full value in tooltip when content is truncated |
| Copy cell value to clipboard | 🔲 | Via click or keyboard shortcut |
| Search highlight in cells | 🔲 | Highlight matching text when global search is active |

---

## Empty & Loading States

| Feature | Status | Notes |
|---------|--------|-------|
| Loading skeleton rows | 🔲 | Placeholder rows rendered while loading state is active |
| Empty state | 🔲 | Shown when data is empty; overridable via DI or compound pattern |
| "No results" state | 🔲 | Distinct message when data exists but filters return nothing |

---

## Pagination

| Feature | Status | Notes |
|---------|--------|-------|
| Prev / Next / First / Last buttons | ✅ | |
| Page size selector | ✅ | |
| Jump-to-page input | 🔲 | Direct page number input |

---

## Accessibility

| Feature | Status | Notes |
|---------|--------|-------|
| Sort keyboard navigation (Enter / Space) | ✅ | |
| `aria-sort` on `<th>` | 🔲 | |
| `role="grid"` on table element | 🔲 | |
| Arrow-key row / cell navigation | 🔲 | |
| Screen-reader live region for state changes | 🔲 | Announce sort / filter changes |

---

## Developer Experience

| Feature | Status | Notes |
|---------|--------|-------|
| `useDataGridState(table, selector)` hook | 🔲 | Subscribe to a slice of state to avoid unnecessary re-renders |
| Storybook / sandbox stories per feature | 🔲 | |

---

## Notes
- `filtering.variant` is a `<DataGrid>`-level prop, not per-column config.
- The `panel` variant renders filters outside the table — layout is up to the consumer using the compound pattern.
- Compound pattern (`<DataGrid.FilterPanel />` etc.) is the escape hatch for custom placements like sidebars or sheets.
- New cell types live in `built-in-cell-types.tsx`.
- New compound sub-components get attached to `DataGrid.*` in `data-grid.tsx`.
