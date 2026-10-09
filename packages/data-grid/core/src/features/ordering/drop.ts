/**
 * Dropping one item onto another — the same reordering the step helpers do, from a target the
 * user named rather than one computed by stepping.
 *
 * A step's target is found by walking the order outward from the source (`findNeighbour`); a
 * drop's target is named, and may be any distance away, so there is nothing to walk. What
 * survives the difference is the rule set — same pin band, same parent, both ends movable, the
 * target within `scope` — applied to the two ends directly. A drag must not be able to produce an
 * arrangement a menu entry would have refused, so the two paths have to agree.
 *
 * **The column half does not restate those rules — it asks the step path.** `canDropColumn` is
 * `isColumnReachableByStepping`, which walks with `findNeighbourIndex` itself, so every boundary arrives
 * in whichever flavour that function gives it and a rule added there is honoured here without
 * anyone remembering to copy it. That shape was arrived at the hard way. Two earlier revisions
 * compared the two ends against a list written out beside the step's, and each shipped a
 * disagreement: the first missed that a **pinned** column between two same-band siblings ends the
 * step's walk, the second that a **locked** one does. Both let a drag produce an arrangement the
 * menu refused, and the locked case moved the very column whose place the author had fixed. So do
 * not "optimise" the walk back into a comparison of the two ends, and do not add a rule to
 * `canDrop` that `findNeighbourIndex` does not have.
 *
 * **The row half does the same, and the argument for not bothering was wrong.** It compared its two
 * ends on the grounds that a row's only walls are its band and its parent, and that leaves under one
 * parent are contiguous. Contiguity is an invariant the *move rules* maintain, not one the *state*
 * guarantees: `applyRowOrder` permutes the rendered list within the slots the named rows occupy, so
 * an order naming a sub-row lifts it above its own parent in the projection and the two ends read as
 * siblings where the walk sees a boundary. Both axes therefore ask their own step path, and neither
 * keeps a copy of its rules.
 *
 * Both halves live in one module rather than beside their own step helper because the drop rules
 * only make sense read as one set, and because the two axes' `pinnedBand` helpers are the easiest
 * thing in this folder to confuse — here they are imported under names that say which is which.
 */

import { readForeignSlice, readOwnSlice } from '../../feature-state'

import { applyRowOrder } from './apply-row-order'
import { ColumnMoveScope, isColumnReachableByStepping, isMovable } from './ordering'
import { isRowReachableByStepping, RowMoveDirection } from './row-ordering'

import type { ColumnOrderingTable, OrderableColumn } from './ordering'
import type { OrderableRow, RowMove, RowOrderingTable } from './row-ordering'
import type { ColumnOrderState } from '@tanstack/table-core'

/**
 * Whether `columnId` may land on `targetColumnId`, given the leaf list both were looked up in.
 *
 * Two clauses, and only two, because `isReachableByStepping` supplies the rest:
 *
 * - **the source is movable** — a system column has a fixed place in the layout and
 *   `ordering: false` says the author fixed one there, so neither is a thing to drag. This is the
 *   one rule the walk cannot supply: it checks each *candidate* it arrives at, which is the target
 *   and everything passed on the way, never the column the walk started from. `canMoveColumn` keeps
 *   the same check for the same reason.
 * - **the target is reachable by stepping** — which brings the band, the parent, the scope, the
 *   target's own lock and every future rule with it. A target the walk steps *over* is
 *   unreachable, and that is right: a hidden target under {@link ColumnMoveScope.Visible} and a
 *   target in another band are both things the user cannot have aimed at in the surface this scope
 *   describes. A drop onto the source itself is refused there too.
 *
 * `scope` therefore ends up asked of the columns the walk passes and of the target, never of the
 * source — the same one-sidedness `canMoveColumn` has, and for the same reason: it says where the
 * user is looking for a landing spot, not what may be picked up. A hidden source has a legal drop
 * onto a visible target. Nothing can drag one in the header, since it renders no cell there; the
 * case belongs to the column panel, which lists hidden columns precisely so they can be reordered.
 */
function canDrop(
	columns: OrderableColumn[],
	sourceIndex: number,
	targetIndex: number,
	scope: ColumnMoveScope,
): boolean {
	const source = columns[sourceIndex]
	if (!source || !isMovable(source)) return false
	return isColumnReachableByStepping(columns, sourceIndex, targetIndex, scope)
}

/**
 * The indices of a drop's two ends, or `undefined` when either id names no leaf column here.
 *
 * Indices rather than columns because the walk continues from them. Resolved in one place because
 * `canDropColumn` and `dropColumn` differ only in what they return, and a second copy of the lookup
 * is a second place for the unknown-id refusal to drift.
 */
function resolveEnds(
	columns: OrderableColumn[],
	columnId: string,
	targetColumnId: string,
): { sourceIndex: number; targetIndex: number } | undefined {
	const sourceIndex = columns.findIndex((column) => column.id === columnId)
	const targetIndex = columns.findIndex((column) => column.id === targetColumnId)
	if (sourceIndex === -1 || targetIndex === -1) return undefined
	return { sourceIndex, targetIndex }
}

/**
 * Whether `columnId` may land on `targetColumnId` — what a drag handle's `disabled` reads, and
 * what a drop handler checks before committing.
 *
 * Exists beside {@link dropColumn} rather than being inferred from it because that helper answers
 * a refusal with the current order, which is indistinguishable from a legal drop that happened to
 * change nothing. A caller writes the same two lines the menu path writes:
 * `if (!canDropColumn(…)) return; table.setColumnOrder(dropColumn(…))` — so a refused drop fires
 * no change at all.
 */
export function canDropColumn(
	table: ColumnOrderingTable,
	columnId: string,
	targetColumnId: string,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): boolean {
	const columns = table.getAllLeafColumns()
	const ends = resolveEnds(columns, columnId, targetColumnId)
	if (!ends) return false
	return canDrop(columns, ends.sourceIndex, ends.targetIndex, scope)
}

/**
 * The column order that results from dropping `columnId` onto `targetColumnId`, or the current
 * order unchanged when that drop is not available.
 *
 * Always the **complete** list of leaf ids, for the reason `moveColumn` records: TanStack reads a
 * partial `columnOrder` as "these first, then the rest as declared", so writing only the columns
 * that moved would silently reorder every column that did not.
 *
 * The source lands **where the target was** — the target's index in the order as it stands, read
 * before the source is lifted out of it. That is the one arithmetic detail worth stating, because
 * reading the index afterwards is both plausible and wrong: removing a source that sat earlier in
 * the order shifts the target down by one, so a forward drop would land one place short and a
 * drop onto the immediately following column would return the order unchanged — a drag that
 * appears to do nothing. `moveColumn` and `applyRowMove` both read the index first, for exactly
 * this reason.
 */
export function dropColumn(
	table: ColumnOrderingTable,
	columnId: string,
	targetColumnId: string,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): ColumnOrderState {
	const columns = table.getAllLeafColumns()
	const order = columns.map((column) => column.id)

	const ends = resolveEnds(columns, columnId, targetColumnId)
	if (!ends || !canDrop(columns, ends.sourceIndex, ends.targetIndex, scope)) return order

	const next = [...order]
	next.splice(ends.sourceIndex, 1)
	next.splice(ends.targetIndex, 0, columnId)
	return next
}

/**
 * Whether `rowId` may land on `targetRowId`.
 *
 * Verbatim the shape `canMoveRow` uses — the producer already answers `undefined` for every
 * refusal, so asking it is the only way to keep the two answers from drifting apart.
 */
export function canDropRow(table: RowOrderingTable, rowId: string, targetRowId: string): boolean {
	return dropRow(table, rowId, targetRowId) !== undefined
}

/**
 * The move that results from dropping `rowId` onto `targetRowId`, or `undefined` when that drop
 * is not available.
 *
 * Unavailable while a sort or a grouping is applied, for the reasons `moveRow` records in full:
 * both compute the row order from the data, so a manual arrangement would be recomputed away on
 * the next render and the row would visibly spring back — and under a grouping half the rows are
 * synthetic groups, for which "put this row there" has no answer at all. Guarded here rather than
 * in the adapter so one check covers every affordance, the drag included.
 *
 * Two rules are this helper's own, and both are stated rather than left to be discovered:
 *
 * - **`direction` restates which side of the target the row lands on.** It is derived, not
 *   supplied — computed from the resolved positions — but it is not redundant. `applyRowMove`
 *   splices to the target's index without reading the field, which puts the source *after* the
 *   target when it came from before it and *before* the target when it came from after: the same
 *   fact, encoded in the arithmetic instead of read off the payload. So a controlled consumer
 *   implementing `onChange` as "insert next to `targetRowId`" needs this field, or its own
 *   positions, to know which side that is.
 * - **A child row may be dropped among its own siblings.** The parent check is what keeps it
 *   there: a leaf that jumped into an adjacent subtree would change its parent, which is a
 *   different operation with a different meaning. This helper knows nothing of controlled versus
 *   uncontrolled mode — the uncontrolled order cannot express a sub-row's position at all, and
 *   that limit is enforced one level up, in `rowOrderingFeature`. This helper makes no such check:
 *   `isTopLevelRow` is called by `canDropRow`, which refuses a sub-row in uncontrolled mode before
 *   this is reached, and by the shared `commit` that `table.ordering.dropRow` hands its result to,
 *   which drops the move rather than writing an order that cannot express it.
 *
 * Describes the drop and performs none of it, exactly as `moveRow` does.
 */
export function dropRow(table: RowOrderingTable, rowId: string, targetRowId: string): RowMove | undefined {
	// Two foreign slices and one own, read one at a time. `sorting` and `grouping` belong to
	// optional features, so an absent slice reads as "none applied"; `rowOrder` is
	// `rowOrderingFeature`'s own, and calling this on a table that never registered the feature is
	// a composition mistake the named throw reports rather than papering over.
	if ((readForeignSlice(table, 'sorting') ?? []).length > 0) return undefined
	if ((readForeignSlice(table, 'grouping') ?? []).length > 0) return undefined
	const rowOrder = readOwnSlice(table, 'rowOrder')

	// Projected through `rowOrder` so that `direction` describes the arrangement on screen rather
	// than the one in `data`. Unlike the identical line in `moveRow`, this changes no refusal below
	// and cannot change which rows are named: `applyRowOrder` permutes `data` within the slots the
	// ordered rows already occupy, so membership is preserved, and the band and parent are read off
	// the row objects, which it only moves. That makes the projection informational here, exactly as
	// far as `direction` is. It assumes the uncontrolled path owns the slice — a controlled grid that
	// also seeds `initialState.rowOrder` gets a direction measured against an arrangement nothing
	// renders, which is the one state where this line misleads.
	const rows: OrderableRow[] = applyRowOrder(table.getRowModel().rows, rowOrder, (row) => row.id)
	const sourceIndex = rows.findIndex((row) => row.id === rowId)
	const targetIndex = rows.findIndex((row) => row.id === targetRowId)
	if (sourceIndex === -1 || targetIndex === -1) return undefined

	// The band, the parent, the subtree skip, a drop onto the source itself and every rule this axis
	// later grows all arrive from the walk. Nothing about them is restated here, which is the point:
	// a second copy of the rules disagreed with the first on three separate occasions.
	if (!isRowReachableByStepping(rows, sourceIndex, targetIndex)) return undefined

	return {
		rowId,
		targetRowId,
		direction: targetIndex < sourceIndex ? RowMoveDirection.Up : RowMoveDirection.Down,
	}
}
