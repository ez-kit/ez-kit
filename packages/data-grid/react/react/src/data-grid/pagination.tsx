import { useGridComponents } from '../components-context'

import { useDataGridInstance, useDataGridStore } from './table-context'

import type { ReactNode } from 'react'

/** A trusted page total of zero — the grid is known to be empty, so there is nothing to paginate. */
const EMPTY_TOTAL = 0

/**
 * What a `<DataGrid.Pagination>` render function receives — the footer model this component
 * derives, already settled.
 *
 * The two totals are the reason this is worth exposing rather than re-deriving: each is
 * `undefined` when the grid cannot be trusted to know it. `pageCount` is `undefined` for the
 * `-1` sentinel a manual grid carries when given neither `rowCount` nor `pageCount`;
 * `rowCount` is `undefined` under `manualPagination` without an explicit `rowCount`, because
 * `data` is then only the current page and its length is not the total.
 */
export type DataGridPaginationRenderArgs = {
	pageIndex: number
	pageSize: number
	/** Total pages, or `undefined` when unknown. */
	pageCount: number | undefined
	/** Total rows, or `undefined` when the grid cannot be trusted to know it. */
	rowCount: number | undefined
	canPreviousPage: boolean
	canNextPage: boolean
	previousPage: () => void
	nextPage: () => void
	firstPage: () => void
	/** No-op when {@link DataGridPaginationRenderArgs.pageCount} is unknown. */
	lastPage: () => void
	setPageIndex: (pageIndex: number) => void
}

export type DataGridPaginationProps = {
	/**
	 * Custom footer content, replacing the kit's `Pagination` component.
	 *
	 * The render function receives the whole settled model, so a custom footer never has to
	 * repeat the page-count and row-count trust rules. Everything that hides the footer
	 * entirely — the initial-load skeleton, a grid with no pagination row model, a trusted
	 * total of zero — still applies, so `children` are not rendered in those states either.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Pagination>
	 *   {({ pageIndex, pageCount, previousPage, nextPage }) => (
	 *     <nav>
	 *       <button onClick={previousPage}>Prev</button>
	 *       <span>{pageIndex + 1} / {pageCount ?? '?'}</span>
	 *       <button onClick={nextPage}>Next</button>
	 *     </nav>
	 *   )}
	 * </DataGrid.Pagination>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridPaginationRenderArgs) => ReactNode)
}

/**
 * Pagination controls. Rendered only when `pagination` is enabled in config.
 *
 * Subscribes only to slices that affect what's displayed (`pagination`,
 * `loading.isPending`) and slices that influence `getPageCount()` (which
 * depends on the row model). Editing / column / selection mutations do NOT
 * touch any of these → no re-render.
 */
export function Pagination({ children }: DataGridPaginationProps = {}) {
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

	const previousPage = () => {
		table.previousPage()
	}
	const nextPage = () => {
		table.nextPage()
	}
	const firstPage = () => {
		table.setPageIndex(0)
	}
	// No-op when the page count is unknown — there is no last page to jump to.
	// (Unguarded this called setPageIndex(-2) for the -1 sentinel.)
	const lastPage = () => {
		if (pageCount !== undefined) table.setPageIndex(pageCount - 1)
	}
	const setPageIndex = (nextIndex: number) => {
		table.setPageIndex(nextIndex)
	}

	if (children !== undefined) {
		return typeof children === 'function'
			? children({
					pageIndex,
					pageSize,
					pageCount,
					rowCount,
					canPreviousPage: canPrevious,
					canNextPage: canNext,
					previousPage,
					nextPage,
					firstPage,
					lastPage,
					setPageIndex,
				})
			: children
	}

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
			onPreviousPage={previousPage}
			onNextPage={nextPage}
			onFirstPage={firstPage}
			onLastPage={lastPage}
			onPageChange={setPageIndex}
		/>
	)
}
