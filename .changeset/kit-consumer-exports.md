---
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Re-export the full consumer surface from the kit packages, so a kit is self-sufficient and consumers no longer need `@ez-kit/data-grid-react` as a second dependency to reach it.

Newly available from `@ez-kit/data-grid-shadcn` and `@ez-kit/data-grid-heroui`:

- values — `defineColumns`, `extractState`, `parseState`, `useExtractedState`, `ValidationError`
- types — `ColumnDef`, `ColumnFiltersState`, `DataGridProps`, `DateRangePreset`, `SortingState`, `TableState`

```ts
// before — two packages
import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { defineColumns } from '@ez-kit/data-grid-react'

// after — one
import { DataGrid, useDataGrid, defineColumns } from '@ez-kit/data-grid-shadcn'
```
