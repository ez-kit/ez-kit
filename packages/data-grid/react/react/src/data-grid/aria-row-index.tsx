'use client'

import { createContext, useContext, useMemo } from 'react'

import { resolvePageStartIndex } from './aria-state'
import { useDataGridState } from './table-context'

import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { Row } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Resolves a row's `aria-rowindex` — its 1-based position in the **whole** row set, not in the
 * page or the virtual window the DOM happens to hold.
 *
 * It is a context rather than a prop so that `<DataGrid.Row>` keeps the props it documents: a
 * consumer composing their own body renders the same component and gets the same index, and the
 * index does not become something a call site can get wrong.
 *
 * `undefined` when the grid renders every row it has — {@link hasPartialRowSet} — in which case
 * no row carries the attribute and none should.
 */
const AriaRowIndexContext = createContext<((row: Row<GridFeatures, never>) => number) | undefined>(undefined)

export type AriaRowIndexProviderProps<TRow extends object = ErasedRow> = {
	table: DataTable<GridFeatures, TRow>
	/** False for a grid whose DOM holds every row; the context then publishes nothing. */
	enabled: boolean
	children: ReactNode
}

export function AriaRowIndexProvider<TRow extends object = ErasedRow>({
	table,
	enabled,
	children,
}: AriaRowIndexProviderProps<TRow>) {
	const rows = table.getRowModel().rows
	const headerRowCount = table.getHeaderGroups().length
	// Read through the store rather than off the table: this is a subscription, so a page change
	// rebuilds the map, and `pagination` is absent altogether without `rowPaginationFeature`.

	const pagination = useDataGridState((s) => s.pagination as { pageIndex: number; pageSize: number } | undefined)
	const pageStart = resolvePageStartIndex(pagination)

	/**
	 * One pass over the rendered model, not a lookup per row: a virtualized grid asks for ~30
	 * indices out of a model that may hold a hundred thousand rows, and `indexOf` per row would
	 * make that quadratic. `getRowModel()` is memoised upstream, so the map is rebuilt only when
	 * the model itself changed.
	 */
	const resolve = useMemo(() => {
		if (!enabled) return undefined

		const positions = new Map<string, number>()
		rows.forEach((row: Row<GridFeatures, TRow>, index: number) => positions.set(row.id, index))

		// ARIA counts the header rows, so the first body row of the first page is
		// `headerRowCount + 1`.
		return (row: Row<GridFeatures, never>): number => (positions.get(row.id) ?? 0) + pageStart + headerRowCount + 1
	}, [enabled, rows, pageStart, headerRowCount])

	return <AriaRowIndexContext.Provider value={resolve}>{children}</AriaRowIndexContext.Provider>
}

/** `{ 'aria-rowindex': n }` for one body row, or `{}` when the grid renders every row. */
export function useAriaRowIndexAttrs<TRow extends object = ErasedRow>(
	row: Row<GridFeatures, TRow>,
): { 'aria-rowindex'?: number } {
	const resolve = useContext(AriaRowIndexContext)
	if (resolve === undefined) return {}
	return { 'aria-rowindex': resolve(row as unknown as Row<GridFeatures, never>) }
}

/**
 * The header rows take the indices before the body: `aria-rowindex` is 1-based over the whole
 * grid, and ARIA counts a header row as a row.
 */
export function useAriaHeaderRowIndexAttrs(index: number): { 'aria-rowindex'?: number } {
	const resolve = useContext(AriaRowIndexContext)
	if (resolve === undefined) return {}
	return { 'aria-rowindex': index + 1 }
}
