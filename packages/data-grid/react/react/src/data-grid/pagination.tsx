import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

/**
 * Pagination controls. Rendered only when `pagination` is enabled in config.
 */
export function Pagination() {
	const table = useTableContext()
	const { Pagination: PaginationComponent } = useGridComponents()

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
