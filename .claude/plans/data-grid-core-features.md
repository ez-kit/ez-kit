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
| Infinite scroll — downward (forward)               | 🔲     | `pagination.mode: 'infinite'`; agnostic/event-only — see Infinite Scroll section |
| Infinite scroll — upward (backward / prepend)      | 🔲     | **Future.** API reserves `direction: 'backward'` + `hasPreviousPage`; needs scroll-anchoring. NOT in v1 |

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

## Infinite Scroll

> Loads more rows as the user scrolls toward an edge. **Agnostic / event-only**:
> the consumer owns the data (fetch + `appendData`), the grid owns request status
> and edge detection. Lives as a **mode of pagination** (`pagination.mode: 'infinite'`),
> mutually exclusive with classic page-based pagination.

### Scope

| Direction              | v1     | Notes                                                                 |
| ---------------------- | ------ | --------------------------------------------------------------------- |
| Forward (scroll down)  | 🔲 v1  | Trivial — append rows at the bottom, no scroll compensation needed    |
| Backward (scroll up)   | 🔲 v2  | **Designed-in but not built.** Needs scroll-anchoring; see below      |

### Layering

- **core** — `PaginationConfig` gains `mode`, `onLoadMore`, controlled `hasNextPage`
  (+ reserved `hasPreviousPage`). New `InfiniteFeature` (à la `LoadingFeature`) owns
  `state.infinite` status flags. Core never observes the DOM — it only holds state +
  exposes `setInfiniteStatus()`, `getCanLoadMore(direction)`, and ergonomic
  `appendData()` / `prependData()` (immutable).
- **react/react** — `useInfiniteScroll` orchestration: edge detection
  (IntersectionObserver on sentinel rows → works **without** virtualization; cheaper
  virtualizer-index path when virtualized), promise lifecycle → `setInfiniteStatus`,
  duplicate-call guard, and (v2) prepend scroll-anchoring. Renders structural,
  **unstyled** `data-slot="load-more-row" | "load-more-sentinel"` with `data-direction`.
  Detection tuning (`trigger`, `threshold`) lives in `ReactPaginationConfig`.
- **shadcn / heroui** — styled injectable `LoadMoreRow` (spinner / "Load more" button /
  "Retry" on error), driven purely by props.

### State (`state.infinite`)

| Field                    | Owner | Notes                                              |
| ------------------------ | ----- | -------------------------------------------------- |
| `isFetchingNextPage`     | grid  | Set around the `onLoadMore` promise                |
| `isFetchingPreviousPage` | grid  | v2                                                 |
| `hasNextPage`            | user  | Controlled input (consumer's API knows it)         |
| `hasPreviousPage`        | user  | v2                                                 |
| `error`                  | grid  | `{ direction, error }` → drives Retry affordance   |

### Triggers

- `trigger: 'auto'` (default) — grid calls `onLoadMore` when the edge sentinel enters view.
- `trigger: 'manual'` — grid renders a "Load more" button; same `onLoadMore`, auto-detector off.
- Future: `'auto-then-manual'` (N auto pages, then button).

### v2 backward-compat guarantee

The forward-only v1 must not require API changes to add backward later:

- `onLoadMore` already receives `{ direction }` — v1 only ever passes `'forward'`.
- `hasPreviousPage` / `isFetchingPreviousPage` / `prependData` reserved in types now.
- `data-direction` attribute + per-direction sentinels designed from the start.

---

## Loading State Rework (tracked with Infinite Scroll task)

> `TableConfig.loading?: boolean` is awkward: a bare top-level boolean, inconsistent
> with the `boolean | XConfig` shape of every other feature, and it duplicates into
> `state.loading.isLoading` via an effect. To be reworked **in the same task** as
> infinite scroll so initial-load and incremental-fetch status share one coherent model.

**Root cause (decided):** the duplication is a **dual write channel** — `loading` is
settable both declaratively (`config.loading` → effect → state) **and** imperatively
(`table.setLoading()`). Two writers into `state.loading.isLoading` drift.

**Fix — single source of truth per field:**

- **User-owned status** (`loading`, `hasNextPage`) → **controlled prop only**. The grid
  mirrors it into state as a read-only projection for the render layer. Remove the public
  `setLoading()` setter (the duplicate channel).
- **Grid-owned status** (`isFetchingNextPage`, `error`) → **grid setter only**
  (`setInfiniteStatus`), never a prop.
- Invariant: every status field has exactly **one** writer. No field writable from both
  config and method.

---

## Notes

- All new features follow the `TableFeature` pattern.
- Operator logic is part of the core filtering pipeline — no React imports.
- `operators: false` on a column completely opts it out of operator UI and logic.
