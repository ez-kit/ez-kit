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

// Compose once per application. A table has only the features you register — everything else,
// stock or ours, stays out of your bundle.
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

`features` is required and has no default: the only default possible is the all-in set, which would be what everyone who never thought about it shipped. `allDataGridFeatures` is that set, exported for prototypes and documentation examples and documented as defeating the point.

**Registering a feature does not switch it on, and configuring one does not register it.** `features` decides what code exists; the config (`sorting: true`, `sorting: false`, `editing: { mode: 'row' }`) decides whether this table uses it — so one shared grid definition works at a dozen call sites with half of it off. Configuring a feature you did not register is **not** a compile error: it is a no-op, and the only thing that reports it is a development-mode warning naming the missing feature.

The returned `table` is a TanStack Table v9 instance extended with the data-grid features. Read rows with `table.getRowModel()`. State lives in atoms: `table.store` is the whole-state observable (`table.store.state` for the current snapshot, `table.store.subscribe(fn)` to follow it), `table.atoms.<slice>.get()` reads one slice, and `table.initialState` is the state as of construction. Writes go through the APIs a registered feature installs — `table.setSorting(...)`, `table.setColumnFilters(...)`, and the grid's own `table.editing` / `table.creating` / `table.draft` namespaces. `table.getState()` and `table.setState()` **do not exist**: they were v8's, and v9 replaced them with the atoms above rather than renaming them.

To mirror state into your own store, pass `onStateChange` — it receives the resolved next state.

## License

MIT
