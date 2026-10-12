import { ColumnSortDirection } from '../types'

import type { DataTable, ErasedRow, GridFeatures } from '../types'

/**
 * The grid's state, as the accessibility tree reads it.
 *
 * Everything here is written by the **shared** layer rather than by a kit, for the reason
 * `aria-label` on the table is: a screen reader's account of a sort, a selection or a row total
 * is a property of the grid, not of how one kit draws it, and a rule that lived in each kit
 * would be a rule one kit could quietly not have. Both kits gained all of it at once.
 *
 * Precedence is deliberate where a kit does have an opinion. The heroui kit renders through
 * React Aria, whose components build their own prop bag and spread it **after** whatever they
 * were handed (this is the same mechanism as issue #223), so anything React Aria authors for
 * its collection wins over the value written here — which is the right way round, since it is
 * the one that knows what its collection currently holds.
 */

/** `aria-sort`, as ARIA spells the three states a sortable column can be in. */
export const AriaSort = {
	Ascending: 'ascending',
	Descending: 'descending',
	None: 'none',
} as const

export type AriaSort = (typeof AriaSort)[keyof typeof AriaSort]

const SORT_DIRECTION_TO_ARIA: Record<ColumnSortDirection, AriaSort> = {
	[ColumnSortDirection.Asc]: AriaSort.Ascending,
	[ColumnSortDirection.Desc]: AriaSort.Descending,
	[ColumnSortDirection.None]: AriaSort.None,
}

/**
 * `aria-sort` for one header cell, or nothing at all.
 *
 * A column that cannot be sorted gets no attribute rather than `'none'`: `'none'` means "sortable,
 * not currently sorted", so writing it on every column would announce a whole grid as sortable.
 */
export function ariaSortAttrs(canSort: boolean, direction: ColumnSortDirection): { 'aria-sort'?: AriaSort } {
	return canSort ? { 'aria-sort': SORT_DIRECTION_TO_ARIA[direction] } : {}
}

/**
 * `aria-expanded` for one row, or nothing at all.
 *
 * A row that cannot expand gets no attribute rather than `'false'`, for the same reason an
 * unsortable column gets no `aria-sort`: `false` means "expandable, currently closed", so writing
 * it on every row would announce a flat grid as a tree.
 *
 * The attribute belongs on the row rather than on the chevron. A reader arriving at the row is
 * told it can be opened before finding the control that opens it, and a kit that draws no chevron
 * at all still announces the state. The chevron keeps its own label — the two are not redundant,
 * because the button says what activating it *does* and the row says what it currently *is*.
 */
export function ariaExpandedAttrs(canExpand: boolean, isExpanded: boolean): { 'aria-expanded'?: boolean } {
	return canExpand ? { 'aria-expanded': isExpanded } : {}
}

/**
 * Whether this grid's DOM holds every row it has.
 *
 * `aria-rowcount` / `aria-rowindex` exist for the case where it does not — paginated, virtualized
 * or infinitely scrolled — and ARIA is explicit that they are unnecessary when every row is
 * present. So a plain grid gets neither, and a reader counts the rows it can see.
 */
export function hasPartialRowSet<TRow extends object = ErasedRow>(table: DataTable<GridFeatures, TRow>): boolean {
	if (table.options.manualPagination === true) return true
	const total = rowTotalOf(table)
	return total !== undefined && total > table.getRowModel().rows.length
}

/**
 * The grid's row total, or `undefined` when it has no way to have one.
 *
 * Optional-called, not called: `getRowCount` is `rowPaginationFeature`'s, and every caller here
 * runs for a grid that may not have registered it — a set without pagination used to fail as
 * `table.getRowCount is not a function` on first render. See `feature-optionality.test.tsx`.
 */
export function rowTotalOf<TRow extends object = ErasedRow>(table: DataTable<GridFeatures, TRow>): number | undefined {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	return table.getRowCount?.()
}

/**
 * ARIA's own "the total is not known" sentinel, which is what an infinite grid honestly has:
 * `hasNextPage` says another page exists without saying how many rows are behind it.
 */
export const UNKNOWN_ROW_COUNT = -1

/**
 * `aria-rowcount` — every row the query matches, plus the header rows, which ARIA counts.
 *
 * The row total is trustworthy exactly when the grid paginates client-side or the consumer
 * supplied one; a manual grid told neither `rowCount` nor `pageCount` has no idea, and
 * {@link UNKNOWN_ROW_COUNT} is the answer for it. This is the same test `pagination.tsx` makes
 * before it prints "of N".
 */
export function resolveAriaRowCount<TRow extends object = ErasedRow>(table: DataTable<GridFeatures, TRow>): number {
	const total = hasTrustedRowTotal(table) ? rowTotalOf(table) : undefined
	if (total === undefined) return UNKNOWN_ROW_COUNT
	return table.getHeaderGroups().length + total
}

/**
 * Whether the grid's row total means anything. This is the same test `pagination.tsx` makes
 * before it prints "of N": client-side pagination counts the model it holds, and a manual grid
 * knows only what the consumer told it.
 */
export function hasTrustedRowTotal<TRow extends object = ErasedRow>(table: DataTable<GridFeatures, TRow>): boolean {
	return table.options.manualPagination !== true || table.options.rowCount !== undefined
}

/**
 * How far into the whole row set this page starts — what a row's position within the rendered
 * model has to be offset by to become an `aria-rowindex`.
 *
 * The same expression covers both pagination modes: client-side, the model holds every row and
 * the page is a window onto it; manual, the model holds the server's slice for that page. In
 * both, the first row of page *n* is the `n · pageSize`-th row of the set. A grid with no
 * pagination slice starts at zero.
 */
export function resolvePageStartIndex(pagination: { pageIndex: number; pageSize: number } | undefined): number {
	if (pagination === undefined) return 0
	return pagination.pageIndex * pagination.pageSize
}
