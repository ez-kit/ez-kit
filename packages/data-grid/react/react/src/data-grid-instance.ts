import { defaultResolvedGridOptions } from './resolved-options'
import { createTableStore } from './store/table-store'

import type { TableStore } from './store/table-store'
import type { DataTable } from '@ez-kit/data-grid-core'

/**
 * Composite returned by `useDataGrid` (Phase 2). Wraps the TanStack-extended
 * `DataTable` together with a `useSyncExternalStore`-friendly `TableStore`,
 * and surfaces `subscribe`/`getSnapshot` directly for convenience.
 *
 * The `table` field is the canonical TanStack instance — call methods on it
 * (`getRowModel()`, `getHeaderGroups()`, etc.). Use `store` (or the surface
 * aliases) only when wiring a low-level subscription.
 */
export type DataGridInstance<TRow extends object> = {
	table: DataTable<TRow>
	store: TableStore
	subscribe: TableStore['subscribe']
	getSnapshot: TableStore['getSnapshot']
}

/**
 * Build a {@link DataGridInstance} from a {@link DataTable}. Pure glue — no
 * effects, no allocation beyond a small wrapper object and the store's
 * initial-snapshot capture.
 */
export function createDataGridInstance<TRow extends object>(table: DataTable<TRow>): DataGridInstance<TRow> {
	// Seed the resolved options so `table.grid` is never undefined. `useDataGrid` overwrites
	// this wholesale on its first render; a table built straight from `createTable` keeps the
	// all-features-off defaults and still renders.
	table.grid = defaultResolvedGridOptions()
	const store = createTableStore(table)
	return {
		table,
		store,
		subscribe: store.subscribe,
		getSnapshot: store.getSnapshot,
	}
}
