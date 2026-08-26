import { useGridComponents } from '../components-context'

import { useDataGridInstance, useDataGridStore } from './table-context'

/** A trusted page total of zero — the grid is known to be empty, so there is nothing to paginate. */
const EMPTY_TOTAL = 0

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
	// Normalize both totals here so no UI kit ever sees an "unknown" sentinel.
	//
	// `getPageCount()` returns `options.pageCount` verbatim when set, and core sets it to
	// UNKNOWN_PAGE_COUNT (-1) for a manual grid given neither `rowCount` nor `pageCount`.
	const rawPageCount = table.getPageCount()
	const pageCount = rawPageCount >= 0 ? rawPageCount : undefined
	// `getRowCount()` is `options.rowCount ?? prePaginationRowModel.rows.length`. Client-side
	// that fallback is the true total; under `manualPagination` `data` is only the current
	// page, so it is the page length — a total we must not report. The count is therefore
	// trustworthy iff the grid paginates client-side or the consumer supplied `rowCount`.
	const hasTrustedRowCount = table.options.manualPagination !== true || table.options.rowCount !== undefined
	const rowCount = hasTrustedRowCount ? table.getRowCount() : undefined

	// Known-empty grid: a *trusted* total of zero means there is nothing to paginate, so the
	// whole footer is hidden and the empty/no-results state stands alone. This unifies the
	// variants — otherwise `compact` claims `Page 1` while `simple` shows `0–0 of 0` for the
	// same empty table. An *unknown* total is deliberately excluded: it is `undefined` by the
	// normalization above (never `0`), so a manual grid given neither count still renders `Page N`.
	//
	// `pageCount` alone decides this. A trusted `rowCount` of 0 implies `pageCount === 0`:
	// `useDataGrid` keeps the two mutually exclusive (see `use-data-grid.ts` — supplying
	// `rowCount` forces `options.pageCount` to `undefined`), so core always derives
	// `ceil(rowCount / pageSize)` whenever the row total is known. Testing `rowCount === 0` too
	// would add an arm no reachable config can trigger on its own.
	if (pageCount === EMPTY_TOTAL) return null

	const canPrevious = table.getCanPreviousPage()
	const canNext = table.getCanNextPage()
	const { siblings, boundaries } = table.grid.pagination.window

	return (
		<PaginationComponent
			{...(rowCount !== undefined ? { rowCount } : {})}
			{...(pageCount !== undefined ? { pageCount } : {})}
			variant={table.grid.pagination.variant}
			siblings={siblings}
			boundaries={boundaries}
			pageIndex={pageIndex}
			pageSize={pageSize}
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
				// No-op when the page count is unknown — there is no last page to jump to.
				// (Unguarded this called setPageIndex(-2) for the -1 sentinel.)
				if (pageCount !== undefined) table.setPageIndex(pageCount - 1)
			}}
			onPageChange={(pageIndex) => {
				table.setPageIndex(pageIndex)
			}}
		/>
	)
}
