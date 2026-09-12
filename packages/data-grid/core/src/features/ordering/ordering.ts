// TanStack's `Table`, not our `DataTable`: these read `getAllLeafColumns()` and nothing else, and
// the menu builder is handed the plain table off `header.getContext()`.
import type { Column, ColumnOrderState, Table } from '@tanstack/table-core'

/**
 * Which way along the column order a move goes.
 *
 * Logical, not physical — `Start` means "toward the beginning of the order", which under RTL is
 * visually to the right. The same reason `align` is `start` / `end` while `pinning` is
 * `left` / `right`: the order flips with the writing direction, a pinned edge does not.
 */
export const ColumnMoveDirection = {
	Start: 'start',
	End: 'end',
} as const

export type ColumnMoveDirection = (typeof ColumnMoveDirection)[keyof typeof ColumnMoveDirection]

/**
 * Whether this column may be moved at all.
 *
 * Two locks, both per column: a system column (selection / expand / row actions) has a fixed
 * place in the layout, and `ordering: false` on a column def says the author fixed it there.
 */
function isMovable(column: Column<never>): boolean {
	const meta = column.columnDef.meta
	return meta?.isSystemColumn !== true && meta?.ordering !== false
}

/**
 * The neighbour a move would swap with, or `undefined` when there is none.
 *
 * A neighbour has to be **all three** of:
 *
 * - in the same pin group — pinning decides which of the three bands a column sits in, and a
 *   move that crossed a band would look like a pin, not a reorder;
 * - under the same parent header — the header groups are built from the leaf order, so a leaf
 *   dragged into a sibling group splits its parent's header cell in two;
 * - visible — a step should move the column past what the user can see. Hidden columns keep
 *   their own places; they are neither skipped over silently nor landed on.
 *
 * Both ends are also checked for {@link isMovable}: a locked column is not a landing spot.
 */
function findNeighbour(
	columns: Column<never>[],
	index: number,
	direction: ColumnMoveDirection,
): Column<never> | undefined {
	const column = columns[index]
	if (!column) return undefined

	const step = direction === ColumnMoveDirection.Start ? -1 : 1
	const parentId = column.parent?.id
	const pinned = column.getIsPinned()

	for (let i = index + step; i >= 0 && i < columns.length; i += step) {
		const candidate = columns[i]
		if (!candidate) continue
		// A different band or a different parent ends the search rather than skipping past it:
		// what lies beyond is not a neighbour of this column at all.
		if (candidate.getIsPinned() !== pinned) return undefined
		if (candidate.parent?.id !== parentId) return undefined
		if (!candidate.getIsVisible()) continue
		return isMovable(candidate) ? candidate : undefined
	}
	return undefined
}

/** Whether `columnId` can move one step in `direction` — what a menu entry's disabled state reads. */
export function canMoveColumn<TRow extends object>(
	table: Table<TRow>,
	columnId: string,
	direction: ColumnMoveDirection,
): boolean {
	const columns = table.getAllLeafColumns() as unknown as Column<never>[]
	const index = columns.findIndex((column) => column.id === columnId)
	const column = columns[index]
	if (!column || !isMovable(column)) return false
	return findNeighbour(columns, index, direction) !== undefined
}

/**
 * The column order that results from moving `columnId` one step in `direction`, or the current
 * order unchanged when the move is not available.
 *
 * Always the **complete** list of leaf ids: TanStack reads a partial `columnOrder` as "these
 * first, then the rest as declared", so writing only the columns that moved would silently
 * reorder every column that did not.
 */
export function moveColumn<TRow extends object>(
	table: Table<TRow>,
	columnId: string,
	direction: ColumnMoveDirection,
): ColumnOrderState {
	const columns = table.getAllLeafColumns() as unknown as Column<never>[]
	const order = columns.map((column) => column.id)
	const index = columns.findIndex((column) => column.id === columnId)
	const column = columns[index]
	if (!column || !isMovable(column)) return order

	const neighbour = findNeighbour(columns, index, direction)
	if (!neighbour) return order

	const targetIndex = order.indexOf(neighbour.id)
	const next = [...order]
	next.splice(index, 1)
	next.splice(targetIndex, 0, columnId)
	return next
}
