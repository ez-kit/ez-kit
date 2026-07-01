---
'@ez-kit/data-grid-react': minor
---

Re-export the TanStack `SortingState`, `ColumnFiltersState`, and `PaginationState` types from `@ez-kit/data-grid-react`. These are the value types delivered to the manual server-side `sorting.onChange` / `filtering.onChange` / `pagination.onChange` handlers, so consumers can type their server-data state without depending on `@tanstack/table-core` directly.
