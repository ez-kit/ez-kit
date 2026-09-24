'use client'

import { applyRowOrder } from '@ez-kit/data-grid-core'
import { useCallback, useMemo, useSyncExternalStore } from 'react'

import type { DataTable } from './types'
import type { TableFeatures } from '@tanstack/table-core'

/**
 * The stable value read for a grid with no `rowOrderingFeature` registered.
 *
 * Without the feature there is no `rowOrder` slice at all (v9 registers nothing by default), and
 * `useSyncExternalStore` requires a getter that returns the same reference while nothing has
 * changed — a fresh `[]` per call would loop.
 */
const NO_ROW_ORDER: string[] = []

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
export function useOrderedData<TFeatures extends TableFeatures, TRow extends object>(
	table: DataTable<TFeatures, TRow>,
	data: TRow[],
): TRow[] {
	// Read straight off `table.store` rather than through `useDataGridSelector`: this hook runs
	// inside `useDataGrid`, before the table is handed to anything, and the context-bound selector
	// is the layer above it. `table.store` is built once at construction and never replaced, so
	// both callbacks are stable for the table's life.
	const store = table.store
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			// TanStack Store hands back a `Subscription`, React wants a plain teardown.
			const subscription = store.subscribe(() => {
				onStoreChange()
			})
			return () => {
				subscription.unsubscribe()
			}
		},
		[store],
	)
	// `TFeatures` is a parameter here, so `rowOrder` — which exists only with
	// `rowOrderingFeature` — is not nameable on `TableState<TFeatures>`.
	const readRowOrder = useCallback(
		(): string[] => (store.state as { rowOrder?: string[] }).rowOrder ?? NO_ROW_ORDER,
		[store],
	)
	const rowOrder = useSyncExternalStore(subscribe, readRowOrder, readRowOrder)
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
