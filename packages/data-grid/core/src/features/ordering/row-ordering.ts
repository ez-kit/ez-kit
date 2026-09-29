import { readForeignSlice, readOwnSlice } from '../../feature-state'

import { applyRowOrder } from './apply-row-order'

import type { AnyTable } from '../../feature-state'

/**
 * Which way along the row order a move goes.
 *
 * Physical, not logical — unlike {@link ColumnMoveDirection}, whose `start` / `end` name
 * positions along the axis that flips under RTL. Up is up in every writing direction, so this
 * sits with row pinning's `top` / `bottom` rather than with `align`'s `start` / `end`.
 */
export const RowMoveDirection = {
	Up: 'up',
	Down: 'down',
} as const

export type RowMoveDirection = (typeof RowMoveDirection)[keyof typeof RowMoveDirection]

/**
 * One step of a row along the order — the whole payload `ordering.row.onChange` receives.
 *
 * Deliberately not the full order that `ColumnOrderingConfig.onChange` emits. A grid always
 * knows every column, but under server-driven pagination it holds one page of rows and cannot
 * name the order of the rest, so a full order would be a promise it can only keep sometimes.
 * Two ids and a direction are the largest fact the grid actually has, and they are enough to
 * splice an array or to `PATCH` a position.
 */
export type RowMove = {
	/** The row that moved. */
	rowId: string
	/** The row it swapped with — where `rowId` now sits. */
	targetRowId: string
	direction: RowMoveDirection
}

/**
 * Everything a move reads off a row, named structurally.
 *
 * A row's members come from `Row_FeatureMap` keyed by the table's feature set, and `TFeatures` is
 * unresolved in a helper generic over it — the same reason `ordering.ts` names its columns
 * structurally. Stating the shape here also records the one member that is genuinely conditional:
 * `getIsPinned` exists only where `rowPinningFeature` is registered, and a grid with no row
 * pinning has no bands for a move to cross.
 */
export type OrderableRow = {
	id: string
	depth: number
	parentId?: string | undefined
	getIsPinned?: () => unknown
}

/** The band a row sits in, or `false` where the table registers no row pinning. */
const pinnedBand = (row: OrderableRow): unknown => row.getIsPinned?.() ?? false

/**
 * The table surface these helpers need: the two atom bags {@link AnyTable} names, plus the
 * rendered row model.
 *
 * Structural rather than `Table<TFeatures, TData>`, and it stays that way now that the v8
 * `declare module` blocks are gone and `Table` resolves at v9's arity. The reason changed rather
 * than disappearing, and both replacements were tried:
 *
 * - **Generic over `TFeatures`**, as a feature hook is: a column's members come from
 *   `Column_FeatureMap` keyed by the set, so with `TFeatures` unresolved `getIsPinned` is a
 *   `TS2339` — the same wall that made `../../feature-state` necessary for atoms.
 * - **`Table<TableFeatures, RowData>`**, the all-in instantiation: it compiles here but asserts
 *   that every feature's API is present, which makes the `?.` fallbacks below dead code for a
 *   fact that is genuinely conditional — and no narrow table is assignable to it, so every
 *   caller becomes a `TS2379`.
 *
 * So the honest shape is the one that names exactly what is read, with the conditional members
 * optional. See {@link OrderableColumn} / {@link OrderableRow}, which say the same thing per member.
 */
export type RowOrderingTable = AnyTable & { getRowModel: () => { rows: OrderableRow[] } }

/** What {@link findNeighbourIndex} answers when there is no neighbour: no index, not a row. */
const NO_NEIGHBOUR = -1

/**
 * The neighbour a move would swap with, or `undefined` when there is none.
 *
 * The universe is the **rendered** row model, so a page edge and a collapsed subtree are both
 * ends of the order — a row that disappeared onto another page is not a move the user can
 * follow. A neighbour has to be both:
 *
 * - in the same pinning band — pinning decides which of the three bands a row sits in, and a
 *   step across a band would read as a pin, not as a reorder;
 * - under the same parent — with tree data a row moves among its siblings, because a leaf
 *   that jumped into an adjacent subtree would change its parent, which is a different
 *   operation with a different meaning.
 *
 * The two mismatches fail differently, exactly as `findNeighbour` does for a column. A foreign
 * band is **stepped over**: pinning is orthogonal to the order, so a pinned row may sit between
 * two rows of one band, and the user — who sees the pinned rows gathered at the edge — sees those
 * two adjacent. A foreign parent **ends** the search: what lies beyond that boundary is not this
 * row's neighbour at all.
 *
 * Rows **deeper** than this one are the exception, and are stepped over rather than treated as a
 * boundary. An expanded parent is followed in the rendered list by its own children, and a
 * sibling below them is still the sibling below: stopping at the first child would mean an
 * expanded row could never move at all, which is the opposite of moving among siblings.
 */
function findNeighbourIndex(rows: OrderableRow[], index: number, direction: RowMoveDirection): number {
	const row = rows[index]
	if (!row) return NO_NEIGHBOUR

	const step = direction === RowMoveDirection.Up ? -1 : 1
	let cursor = index + step

	for (;;) {
		// Skip the subtree between this row and its sibling — descendants of this row going down,
		// descendants of the sibling above going up. Anything at this depth or shallower is the
		// candidate, and the two checks below decide whether it is a neighbour or a boundary.
		let candidate = rows[cursor]
		while (candidate !== undefined && candidate.depth > row.depth) {
			cursor += step
			candidate = rows[cursor]
		}

		if (!candidate) return NO_NEIGHBOUR
		// A different band is stepped over rather than ending the search, for the reason
		// `findNeighbour` in `./ordering` records per column: pinning is orthogonal to the order, so
		// a pinned row may sit between two rows of one band, and the user — who sees the pinned rows
		// gathered at the edge — sees those two adjacent. Ending here refused a step they expect,
		// and left this path disagreeing with `./drop`, which compares its two ends and cannot see
		// what lies between them.
		if (pinnedBand(candidate) !== pinnedBand(row)) {
			cursor += step
			continue
		}
		// A different parent still ends it: a leaf that jumped into an adjacent subtree would change
		// its parent, which is a different operation with a different meaning.
		if (candidate.parentId !== row.parentId) return NO_NEIGHBOUR
		return cursor
	}
}

/**
 * The neighbour a move would swap with, or `undefined` when there is none.
 *
 * See {@link findNeighbourIndex} for the rules; this is the row-shaped answer its callers want.
 */
function findNeighbour(rows: OrderableRow[], index: number, direction: RowMoveDirection): OrderableRow | undefined {
	const neighbour = findNeighbourIndex(rows, index, direction)
	return neighbour === NO_NEIGHBOUR ? undefined : rows[neighbour]
}

/**
 * Whether repeated stepping from `sourceIndex` lands on `targetIndex`.
 *
 * The row twin of `isColumnReachableByStepping`, and here for the same reason: a drag must not be
 * able to produce an arrangement a menu entry would have refused, and asking the step path is the
 * only way to be sure of that rather than to hope a second copy of the rules still matches.
 *
 * A two-end comparison looked safe on this axis, because a row's only walls are its band and its
 * parent and leaves under one parent are contiguous in the rendered list. That argument is wrong in
 * one word: contiguity is an invariant the **move rules** maintain, not one the **state**
 * guarantees. `applyRowOrder` permutes the rendered list within the slots the named rows already
 * occupy, so an order naming a sub-row lifts it above its own parent in the projection — depths
 * interleave, and a parent check over the two ends then sees siblings where this walk sees a
 * boundary.
 *
 * NOTE: {@link NO_NEIGHBOUR} must be tested before `targetIndex`, because the sentinel and a
 * caller's own `-1` are the same number. Callers resolve both ends before asking, so `-1` never
 * arrives here — the order of the two checks is what keeps that from mattering.
 */
export function isRowReachableByStepping(rows: OrderableRow[], sourceIndex: number, targetIndex: number): boolean {
	if (sourceIndex === targetIndex) return false

	const direction = targetIndex > sourceIndex ? RowMoveDirection.Down : RowMoveDirection.Up
	// Terminates because `findNeighbourIndex` only ever looks in `direction`, so each hop moves
	// strictly that way and the list is finite.
	for (let index = sourceIndex; ; ) {
		const neighbour = findNeighbourIndex(rows, index, direction)
		if (neighbour === NO_NEIGHBOUR) return false
		if (neighbour === targetIndex) return true
		index = neighbour
	}
}

/**
 * Whether `rowId` can move one step in `direction` — what a menu entry's disabled state reads.
 */
export function canMoveRow(table: RowOrderingTable, rowId: string, direction: RowMoveDirection): boolean {
	return moveRow(table, rowId, direction) !== undefined
}

/**
 * The move that results from stepping `rowId` once in `direction`, or `undefined` when that
 * step is not available.
 *
 * Always unavailable while a sort is applied: sorting computes the row order from the data, so
 * a manual move would be recomputed away on the next render and the row would visibly spring
 * back. The menu entries stay listed and disabled, for the same reason the column menu keeps
 * both of its directions visible at the ends of the order.
 *
 * Describes the move and performs none of it — the controlled path hands the descriptor to
 * `ordering.row.onChange`, the uncontrolled path feeds it to {@link applyRowMove}.
 */
export function moveRow(table: RowOrderingTable, rowId: string, direction: RowMoveDirection): RowMove | undefined {
	// Two slices, read one at a time rather than off a whole-state snapshot. `sorting` is
	// **foreign** — `rowSortingFeature` is optional, and a grid without it simply never sorts, so
	// an absent slice reads as "no sort applied". `rowOrder` is `rowOrderingFeature`'s **own**
	// slice, and this helper is that feature's: calling it on a table that never registered the
	// feature is a composition mistake, and the named throw says so rather than letting an empty
	// order compute every move from the original positions.
	if ((readForeignSlice(table, 'sorting') ?? []).length > 0) return undefined
	// Grouping is refused for the very same reason, and is foreign in the very same way: the row
	// order is computed from the grouping levels, so a manual move would be recomputed away on
	// the next render. It is additionally meaningless — half the rows are synthetic groups, and
	// "move this row one step" across a group boundary has no answer. Guarded here rather than in
	// the adapter so that one check covers both affordances: the menu entries stay listed and
	// disabled, and the `Alt+Arrow` handler refuses, exactly as they do under a sort.
	if ((readForeignSlice(table, 'grouping') ?? []).length > 0) return undefined
	const rowOrder = readOwnSlice(table, 'rowOrder')

	// Projected through `rowOrder` rather than read straight off the row model. An adapter
	// rendering an uncontrolled order feeds `applyRowOrder`'s result back as `data`, which makes
	// this projection a no-op — but a grid that has not done so yet would otherwise compute
	// every move from the original positions, so a second step would undo the first.
	const rows = applyRowOrder(table.getRowModel().rows, rowOrder, (row) => row.id)
	const index = rows.findIndex((row) => row.id === rowId)
	if (index === -1) return undefined

	const neighbour = findNeighbour(rows, index, direction)
	if (!neighbour) return undefined

	return { rowId, targetRowId: neighbour.id, direction }
}

/**
 * `order` with `move` applied — the row lifted out and re-inserted at its target's index.
 *
 * Pure and non-mutating. An order naming neither row is returned unchanged rather than
 * repaired: it describes rows this order does not contain, and guessing where they belong is
 * how a reorder silently scrambles a list.
 */
export function applyRowMove(order: readonly string[], move: RowMove): string[] {
	const from = order.indexOf(move.rowId)
	const to = order.indexOf(move.targetRowId)
	if (from === -1 || to === -1) return [...order]

	const next = [...order]
	next.splice(from, 1)
	next.splice(to, 0, move.rowId)
	return next
}
