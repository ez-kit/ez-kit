import { useGridComponents } from '../components-context'

import { useDataGridInstance, useDataGridStore } from './table-context'

/**
 * Pagination controls. Rendered only when `pagination` is enabled in config.
 *
 * Subscribes only to slices that affect what's displayed (`pagination`,
 * `loading.isLoading`) and slices that influence `getPageCount()` (which
 * depends on the row model). Editing / column / selection mutations do NOT
 * touch any of these → no re-render.
 */
export function Pagination() {
	const instance = useDataGridInstance()
	const table = instance.table
	const { Pagination: PaginationComponent } = useGridComponents()

	useDataGridStore((s) => s.pagination)
	useDataGridStore((s) => s.loading.isLoading)
	// Row-model affecting slices (pageCount is derived from rowModel.length).
	useDataGridStore((s) => s.sorting)
	useDataGridStore((s) => s.columnFilters)
	useDataGridStore<unknown>((s) => s.globalFilter)
	useDataGridStore((s) => s.expanded)

	if (table.getIsLoading()) return null
	if (!table.options.getPaginationRowModel) return null

	const { pageIndex } = table.getState().pagination
	const pageCount = table.getPageCount()
	const canPrevious = table.getCanPreviousPage()
	const canNext = table.getCanNextPage()

	return (
		<PaginationComponent
			pageIndex={pageIndex}
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
