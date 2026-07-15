import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { PAGINATION_VARIANT_KEY } from '../use-data-grid'

import { useDataGridInstance, useDataGridStore } from './table-context'

import type { PaginationVariant } from '../types'

function readVariant(table: object): PaginationVariant {
	const variant = (table as Record<symbol, unknown>)[PAGINATION_VARIANT_KEY] as PaginationVariant | undefined
	return variant ?? DATA_GRID_DEFAULTS.pagination.variant
}

/**
 * Pagination controls. Rendered only when `pagination` is enabled in config.
 *
 * Subscribes only to slices that affect what's displayed (`pagination`,
 * `loading.isPending`) and slices that influence `getPageCount()` (which
 * depends on the row model). Editing / column / selection mutations do NOT
 * touch any of these → no re-render.
 */
export function Pagination() {
	const instance = useDataGridInstance()
	const table = instance.table
	const { Pagination: PaginationComponent } = useGridComponents().pagination

	useDataGridStore((s) => s.pagination)
	const isPending = useDataGridStore((s) => s.loading.isPending)
	// Row-model affecting slices (pageCount is derived from rowModel.length).
	useDataGridStore((s) => s.sorting)
	useDataGridStore((s) => s.columnFilters)
	useDataGridStore<unknown>((s) => s.globalFilter)
	useDataGridStore((s) => s.expanded)

	// Hide only during the initial-load skeleton path (`isPending`); a background
	// refetch (`isFetching`) keeps the footer mounted (the overlay dims rows instead).
	if (isPending) return null
	if (!table.options.getPaginationRowModel) return null

	const { pageIndex, pageSize } = table.getState().pagination
	const pageCount = table.getPageCount()
	const rawRowCount = table.getRowCount()
	// `getRowCount()` returns 0 when no rowCount was supplied (TanStack default).
	// Only surface it as a prop when it's meaningful (> 0).
	const rowCount = rawRowCount > 0 ? rawRowCount : undefined
	const canPrevious = table.getCanPreviousPage()
	const canNext = table.getCanNextPage()

	return (
		<PaginationComponent
			{...(rowCount !== undefined ? { rowCount } : {})}
			variant={readVariant(table)}
			pageIndex={pageIndex}
			pageSize={pageSize}
			pageCount={pageCount}
			canPreviousPage={canPrevious}
			canNextPage={canNext}
			onPreviousPage={() => {
				table.previousPage()
			}}
			onNextPage={() => {
				table.nextPage()
			}}
			onFirstPage={() => {
				table.setPageIndex(0)
			}}
			onLastPage={() => {
				table.setPageIndex(pageCount - 1)
			}}
			onPageChange={(pageIndex) => {
				table.setPageIndex(pageIndex)
			}}
		/>
	)
}
