# @ez-kit/data-grid-core — Feature Plan

> Headless, framework-agnostic layer on top of TanStack Table v8.
> Features here are pure state / logic — no React imports.

---

## Legend

- ✅ Done
- 🚧 In progress
- 🔲 Planned

---

## CRUD Operations

| Feature                                    | Status | Notes             |
| ------------------------------------------ | ------ | ----------------- |
| Row editing (row / modal / cell modes)     | ✅     | `EditingFeature`  |
| Row creating (row / modal / pin-row modes) | ✅     | `CreatingFeature` |
| Row deleting                               | ✅     | `DeletingFeature` |

---

## Data Display

| Feature                                | Status | Notes                                                                                                                                    |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sorting — client-side                  | ✅     |                                                                                                                                          |
| Sorting — server-side (manual)         | ✅     |                                                                                                                                          |
| Multi-column sorting                   | ✅     |                                                                                                                                          |
| Filtering — column, client-side        | ✅     |                                                                                                                                          |
| Filtering — global search, client-side | ✅     |                                                                                                                                          |
| Filtering — server-side (manual)       | ✅     |                                                                                                                                          |
| Pagination — client-side               | ✅     |                                                                                                                                          |
| Pagination — server-side (manual)      | ✅     |                                                                                                                                          |
| Row expanding / sub-rows               | ✅     |                                                                                                                                          |
| Row selection (single / multi)         | ✅     |                                                                                                                                          |
| Column pinning (left / right sticky)   | ✅     | `ColumnPinningDef` (`pin` = static, `defaultPin` = dynamic start); `PinningConfig` unifies row + column pinning under one `pinning` prop |
| Loading state                          | ✅     |                                                                                                                                          |

---

## Filtering — Operators

Per-column filter operators allow the user to choose how a filter value is applied.
Column config: `operators: false | OperatorsConfig` — `false` disables operators for that column entirely.

| Operator                         | Applicable types  | Notes                                             |
| -------------------------------- | ----------------- | ------------------------------------------------- |
| `contains`                       | text, select/enum | Default for text; replaces inList for multi-value |
| `equals` / `notEquals`           | all types         | Exact match                                       |
| `startsWith` / `endsWith`        | text              |                                                   |
| `greaterThan` / `lessThan`       | number, date      |                                                   |
| `greaterOrEqual` / `lessOrEqual` | number, date      |                                                   |
| `between`                        | number, date      | Requires two values (min + max)                   |
| `isEmpty` / `isNotEmpty`         | all types         |                                                   |

State per active column filter:

- current operator
- filter value (or `[min, max]` for `between`)

All operator logic runs client-side by default; manual filtering passes raw state to server.

---

## Column Management

| Feature                               | Status | Notes                                                                                                     |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Column visibility / hiding            | ✅     | `visibility: false` locks a column; `visibility: { defaultHidden: true }` seeds TanStack visibility state |
| Column resizing                       | ✅     | `sizing` config; CSS-variable performant pattern; `SizingConfig` type                                     |
| Column reordering                     | 🔲     | Drag to change column order                                                                               |
| Column grouping (multi-level headers) | ✅     | Via nested `columns` in `ColumnDef`                                                                       |

---

## Advanced Data Features

| Feature                                            | Status | Notes                                                                        |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Row grouping (group-by column)                     | 🔲     | Group rows by one or more column values                                      |
| Aggregation (sum / avg / count / min / max)        | 🔲     | Per-column aggregate values for grouped rows                                 |
| Row drag-and-drop reorder                          | 🔲     | User drags rows to reorder; `onReorder` callback                             |
| Row pinning (freeze specific rows to top / bottom) | ✅     | `pinning: true` or `pinning: { row: ... }`; adds `__row_pin__` system column |
| Row virtualization                                 | ✅     | `virtualized` config stored for adapters; React layer renders virtual rows   |

---

## Cell Type Metadata

| Feature                        | Status | Notes                                                                               |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------- |
| Built-in cell type definitions | ✅     | `text`, `number`, `date`, `boolean`, `select`, `badge`, `image`, `link`, `progress` |
| Config types for rich cells    | ✅     | `SelectCellConfig`, `BadgeCellConfig`, `ImageCellConfig`, `ProgressCellConfig`      |
| Custom cell type extension     | ✅     | `ColumnDef<TRow, TCustomCellTypes>` preserves autocomplete plus custom type strings |

---

## Filter Presets / Saved Views

| Feature                                                        | Status | Notes                                                             |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Save current filter + sort + column visibility as named preset | 🔲     | Stored externally by consumer; grid exposes serialization helpers |
| Load / apply a preset                                          | 🔲     |                                                                   |
| Delete a preset                                                | 🔲     |                                                                   |

---

## Export & Utilities

| Feature     | Status | Notes                         |
| ----------- | ------ | ----------------------------- |
| CSV export  | 🔲     | Export visible rows + columns |
| JSON export | 🔲     | Export as structured array    |

---

## State Persistence

| Feature                        | Status | Notes                                                                   |
| ------------------------------ | ------ | ----------------------------------------------------------------------- |
| Snapshot / restore table state | ✅     | Via `getSnapshot()` / `initialState`                                    |
| State serialization helpers    | 🔲     | Pure utilities to serialize/deserialize state (for URL or localStorage) |

---

## Notes

- All new features follow the `TableFeature` pattern.
- Operator logic is part of the core filtering pipeline — no React imports.
- `operators: false` on a column completely opts it out of operator UI and logic.
