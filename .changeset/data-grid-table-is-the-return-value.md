---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

`useDataGrid` returns the table itself. The `DataGridInstance` wrapper is gone.

It used to return `{ table, store, subscribe, getSnapshot }`, and three of those four were the same functions already on the table:

```ts
createTableStore(table) // → { subscribe: table.subscribe, getSnapshot: table.getSnapshot, … }
createDataGridInstance(table) // → { table, store, subscribe: store.subscribe, getSnapshot: store.getSnapshot }
// instance.subscribe === instance.store.subscribe === instance.table.subscribe
```

One function under three names, twice over. The one thing the wrapper genuinely added was a frozen server snapshot for `useSyncExternalStore`, read by exactly one caller — and "the state this table started with" is a fact about the table, so it now lives there as `getInitialSnapshot()`. What was left was a wrapper whose only effect was to put every imperative call one hop further away, and to make the docs name a variable `table` that was not the table.

```ts
// before
const grid = useDataGrid({ data, columns })
grid.table.setColumnVisibility({ email: false })

// after
const table = useDataGrid({ data, columns })
table.setColumnVisibility({ email: false })
```

**Breaking changes**

- `useDataGrid` returns `DataTable<TRow>`; `<DataGrid table={…}>` takes one.
- `DataGridInstance` and `TableStore` are removed, along with `instance.store`.
- `createDataGridInstance` → `prepareDataGridTable(table)`, which seeds `table.grid` and returns the same table. Only needed when driving the compound components from a raw `createTable(...)`.
- `useDataGridSelector(instance, sel)` → `useDataGridSelector(table, sel)`; `useExtractedState(instance, …)` → `useExtractedState(table, …)`.
- `useDataGridInstance()` is removed — with the wrapper gone it was `useDataGridTable()` under another name.

**What this costs.** `DataGridInstance` was a type only `useDataGrid` could produce, so passing an unprepared table to `<DataGrid>` used to be a compile error. It now typechecks, and `<DataGrid>` checks for it in development instead, naming the fix rather than crashing on a missing property.

**New in core** — `DataTable.getInitialSnapshot()`, the frozen construction-time snapshot beside the existing `subscribe` / `getSnapshot`.
