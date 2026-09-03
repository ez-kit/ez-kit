---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Settle the state-reading hooks, and stop `pagination.toolbar` from disabling a hand-placed PageSizer.

**Hooks.** Four overlapping hooks with names that did not say what they did are now four with one job each, and the broad-subscription footgun is gone:

- `useTable(selector?)` → **removed**. Its no-argument form subscribed to the entire `TableState`, so eighteen built-in components re-rendered on every keystroke in a filter box. Replaced by `useDataGridTable<TRow>()`, which reads the table and subscribes to nothing.
- `useDataGridStore(selector)` → renamed **`useDataGridState(selector)`**. Same behaviour; the name now matches what it returns (a slice of state, not a store).
- `useDataGridInstance<TRow>()` and `useDataGridTable<TRow>()` take an optional row type, so composing a custom body or a kit `ActionsCell` no longer erases `row.original` to `any`.
- `useTableContext`, deprecated and unexported, is deleted.

A component that needs both writes them together, and the subscription is now visible at the call site:

```tsx
const table = useDataGridTable<User>()
useDataGridState((s) => s.columnVisibility)
```

`useDataGridState((s) => s)` is the explicit broad subscription where one is genuinely wanted.

**`ActionsCellProps<TRow>`** takes an optional row type for the same reason; omitted, it behaves as before.

**PageSizer.** `pagination: { toolbar: false }` documented that `<DataGrid.PageSizer />` still worked when placed by hand, but the resolver erased `pageSizeOptions` along with the auto-mount, so the hand-placed control rendered nothing. Mounting and data are now separate: `grid.pagination.pageSizer` governs whether the toolbar mounts it, `grid.pagination.pageSizeOptions` is resolved whenever page-based pagination is on — which also means a hand-placed PageSizer works under a bare `pagination: true`, falling back to the default size list.

**Compound member prop types are exported**, matching their thirteen siblings: `DataGridActiveFiltersBarProps`, `DataGridClearFiltersButtonProps`, `DataGridCreateTriggerProps`, `DataGridGlobalFilterInputProps`.
