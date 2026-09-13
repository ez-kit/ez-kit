'use client'

import { applyRowOrder } from '@ez-kit/data-grid-core'
import { useMemo } from 'react'

import { useDataGridSelector } from './use-data-grid-selector'

import type { DataTable } from '@ez-kit/data-grid-core'

/**
 * `data` as the grid should render it under an uncontrolled row order.
 *
 * Reordering happens **upstream of the table**, not in a row model: TanStack has no row-order
 * feature to extend, and rebuilding `data` leaves every row model, every row id and every
 * other state slice untouched.
 *
 * Projecting `data` rather than rewriting `options.data` once per move is what makes a later
 * `data` prop behave: a fresh page from the server is re-projected through the order the user
 * arranged, instead of arriving unordered and quietly discarding it.
 *
 * `useDataGrid` otherwise subscribes to no state at all, which this does not change in
 * practice: the slice is a stable `[]` until the first move, so `useSyncExternalStore` bails
 * out and a grid that never reorders re-renders exactly as often as before.
 */
export function useOrderedData<TRow extends object>(table: DataTable<TRow>, data: TRow[]): TRow[] {
	const rowOrder = useDataGridSelector(table, (state) => state.rowOrder)
	// The **resolved** identity function, not `config.getRowId`: a grid that supplies none still
	// has row ids, because `createTable` falls back to `row.id` before the index. Reading the
	// consumer's option here instead would leave every such grid unordered while the state slice
	// filled up with ids that do address its rows.
	const getRowId = table.options.getRowId

	return useMemo(() => {
		// Controlled mode never writes the slice, so this is also how it stays out of the way:
		// the grid renders the application's array exactly as handed over.
		if (rowOrder.length === 0 || getRowId === undefined) return data
		return applyRowOrder(data, rowOrder, getRowId)
	}, [data, rowOrder, getRowId])
}
