# @ez-kit/data-grid-core

Headless, UI-framework-agnostic data-grid core for **@ez-kit/data-grid**, built on top of [TanStack Table](https://tanstack.com/table) core. It owns columns, features (sorting, filtering, global search, operators, pagination, infinite loading, selection, expanding, visibility, pinning, resizing, virtualization, row actions, editing, creating, deleting, validation, deferred apply) and table state — with no React and no styling.

Most apps should use a UI flavour instead:

- [`@ez-kit/data-grid-shadcn`](../react/shadcn) — Shadcn UI
- [`@ez-kit/data-grid-heroui`](../react/heroui) — HeroUI

Use this package directly only when building your own adapter.

## Install

```bash
pnpm add @ez-kit/data-grid-core @tanstack/table-core
```

`react` and `zod` are optional peer dependencies (needed only for the React adapters and for `zodResolver` validation, respectively).

## Usage

```ts
import { createTable, createColumns } from '@ez-kit/data-grid-core'
import {
	columnFilteringFeature,
	createFilteredRowModel,
	createSortedRowModel,
	filterFns,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

// Compose once per application. A table has only the features you register: everything else
// contributes no state, no API and no work at runtime.
const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

const columns = createColumns([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

const table = createTable({
	features,
	data: [{ name: 'Ada Lovelace', role: 'Engineer' }],
	columns,
	sorting: true,
	filtering: true,
})
```

`features` is required and has no default: the only default possible is the all-in set, which would be what everyone who never thought about it shipped. `allDataGridFeatures` is that set, exported from `@ez-kit/data-grid-core/features/all` — its own subpath, so that reaching the all-in set is a choice rather than something every import of this entry pays for.

Composing a set governs **behaviour** — an unregistered feature contributes no state slice, no API and no work at runtime — **and it governs your bundle**. Measured against the built entry: `tableFeatures` alone costs 994 bytes, `rowSortingFeature` 998, a sorting-only set 1 035, and `editingFeature` 17 163, which is what a feature with a real implementation behind it weighs. The all-in set lives on its own subpath, `@ez-kit/data-grid-core/features/all`, precisely so that reaching it is a choice: while it sat on the main entry, each of those imports cost ~46 kB, because a top-level `tableFeatures({ …stockFeatures, … })` call is not something a bundler can drop.

If you are feeding these options to the React adapter, note that `columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are **structural** there — the shell lays out a column grid and needs visibility, pin groups and widths to do it — so omitting one is a render-time `TypeError`. Every other feature is genuinely optional.

**Registering a feature does not switch it on, and configuring one does not register it.** `features` decides what code exists; the config (`sorting: true`, `sorting: false`, `editing: { mode: 'row' }`) decides whether this table uses it — so one shared grid definition works at a dozen call sites with half of it off. Configuring a feature you did not register is **not** a compile error: it is a no-op, and the only thing that reports it is a development-mode warning naming the missing feature.

The returned `table` is a TanStack Table v9 instance extended with the data-grid features. Read rows with `table.getRowModel()`. State lives in atoms: `table.store` is the whole-state observable (`table.store.state` for the current snapshot, `table.store.subscribe(fn)` to follow it), `table.atoms.<slice>.get()` reads one slice, and `table.initialState` is the state as of construction. Writes go through the APIs a registered feature installs — `table.setSorting(...)`, `table.setColumnFilters(...)`, and the grid's own `table.editing` / `table.creating` / `table.draft` namespaces. `table.getState()` and `table.setState()` **do not exist**: they were v8's, and v9 replaced them with the atoms above rather than renaming them.

To mirror state into your own store, pass `onStateChange` — it receives the resolved next state.

## License

MIT
