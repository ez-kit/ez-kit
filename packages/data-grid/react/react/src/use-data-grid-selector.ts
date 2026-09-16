'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { DataTable } from './types'
import type { TableFeatures, TableState } from '@tanstack/table-core'

/**
 * Subscribe to a slice of a table's state, given the table explicitly.
 *
 * The context-bound form is `useDataGridState`; reach for this one when the table is not in
 * context — reading grid state from a sibling component, or from outside `<DataGrid>`.
 *
 * **Contract:** the selector must return a referentially stable value when
 * the underlying TableState hasn't changed. Direct field access
 * (`(s) => s.sorting`) and primitive computations
 * (`(s) => s.columnFilters.length`) satisfy this — TanStack keeps the same
 * reference for each `TableState` field across reads until that field is
 * mutated. Returning a fresh object or array on every call
 * (`(s) => [...s.sorting]`, `(s) => ({ n: s.columnFilters.length })`)
 * violates the contract and will cause an infinite render loop — derive
 * such values with `useMemo` outside this hook instead.
 *
 * That last guarantee was written about v8's `TableState` and re-verified against v9's atoms,
 * which is where it now comes from: `table.store` is a **readonly derived atom** that rebuilds
 * the snapshot by reading `table.atoms[key].get()` per slice, under `compare: shallow`
 * (`table-core/dist/core/table/constructTable.js:103-112`). So each field is the slice atom's
 * own value — stable until that atom is written — and the snapshot object itself keeps its
 * identity while every slice is unchanged.
 *
 * @example
 *   const table = useDataGrid({ data, columns, sorting: true })
 *   const sorting = useDataGridSelector(table, (s) => s.sorting)
 *   const filterCount = useDataGridSelector(table, (s) => s.columnFilters.length)
 */
export function useDataGridSelector<TFeatures extends TableFeatures, TRow extends object, TSelected>(
	table: DataTable<TFeatures, TRow>,
	selector: (state: TableState<TFeatures>) => TSelected,
): TSelected {
	// `table.store` is built once in `constructTable` and never replaced, so this is stable for
	// the table's life. TanStack Store hands back a `Subscription`; React wants a plain teardown.
	const store = table.store
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const subscription = store.subscribe(() => {
				onStoreChange()
			})
			return () => {
				subscription.unsubscribe()
			}
		},
		[store],
	)

	// One getter for both arguments, which is what upstream's own `useSelector` does: v9 has no
	// server-snapshot concept, `table.getInitialSnapshot()` is gone, and `table.initialState` is
	// the value to pass if a frozen server read is ever wanted.
	const read = (): TSelected => selector(store.state)
	return useSyncExternalStore(subscribe, read, read)
}
