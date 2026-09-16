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
type OrderableRow = {
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
 * Either mismatch **ends** the search rather than skipping past it, exactly as `findNeighbour`
 * does for a column: what lies beyond a boundary is not this row's neighbour at all.
 *
 * Rows **deeper** than this one are the exception, and are stepped over rather than treated as a
 * boundary. An expanded parent is followed in the rendered list by its own children, and a
 * sibling below them is still the sibling below: stopping at the first child would mean an
 * expanded row could never move at all, which is the opposite of moving among siblings.
 */
function findNeighbour(rows: OrderableRow[], index: number, direction: RowMoveDirection): OrderableRow | undefined {
	const row = rows[index]
	if (!row) return undefined

	const step = direction === RowMoveDirection.Up ? -1 : 1
	// Skip the subtree between this row and its sibling — descendants of this row going down,
	// descendants of the sibling above going up. Anything at this depth or shallower is the
	// candidate, and the two checks below decide whether it is a neighbour or a boundary.
	let cursor = index + step
	let candidate = rows[cursor]
	while (candidate !== undefined && candidate.depth > row.depth) {
		cursor += step
		candidate = rows[cursor]
	}

	if (!candidate) return undefined
	if (pinnedBand(candidate) !== pinnedBand(row)) return undefined
	if (candidate.parentId !== row.parentId) return undefined
	return candidate
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
