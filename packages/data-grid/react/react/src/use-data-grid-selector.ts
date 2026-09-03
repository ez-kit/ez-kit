'use client'

import { useSyncExternalStore } from 'react'

import type { DataTable, TableState } from '@ez-kit/data-grid-core'

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
 * @example
 *   const table = useDataGrid({ data, columns, sorting: true })
 *   const sorting = useDataGridSelector(table, (s) => s.sorting)
 *   const filterCount = useDataGridSelector(table, (s) => s.columnFilters.length)
 */
export function useDataGridSelector<TRow extends object, TSelected>(
	table: DataTable<TRow>,
	selector: (state: TableState) => TSelected,
): TSelected {
	return useSyncExternalStore(
		table.subscribe,
		() => selector(table.getSnapshot()),
		() => selector(table.getInitialSnapshot()),
	)
}
