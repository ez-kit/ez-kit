import type { ColumnOrderState } from '@tanstack/table-core'

/**
 * Everything a column move reads off a column, named structurally.
 *
 * A column's members come from `Column_FeatureMap` keyed by the table's feature set, so they are
 * not provable for a helper that accepts any table — and the two reads below are genuinely
 * conditional: `getIsPinned` exists only where `columnPinningFeature` is registered and
 * `getIsVisible` only where `columnVisibilityFeature` is. A grid with neither has one band and
 * nothing hidden, which is what the fallbacks say.
 */
export type OrderableColumn = {
	id: string
	parent?: { id: string } | undefined
	// `ordering?: false` exactly as `ColumnMeta` declares it — the resolved form of
	// `column.ordering` only ever records the lock, never the default.
	columnDef: { meta?: { isSystemColumn?: boolean; ordering?: false } | undefined }
	getIsPinned?: () => unknown
	getIsVisible?: () => boolean
}

/**
 * The table surface these helpers need — TanStack's table, not our `DataTable`: they read
 * `getAllLeafColumns()` and nothing else, and the menu builder is handed the plain table off
 * `header.getContext()`.
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
export type ColumnOrderingTable = { getAllLeafColumns: () => OrderableColumn[] }

/** The band a column sits in, or `false` where the table registers no column pinning. */
const pinnedBand = (column: OrderableColumn): unknown => column.getIsPinned?.() ?? false

/** Whether a column is on screen — everything is, where the table registers no visibility. */
const isVisible = (column: OrderableColumn): boolean => column.getIsVisible?.() ?? true

/**
 * Which way along the column order a move goes.
 *
 * Logical, not physical — `Start` means "toward the beginning of the order", which under RTL is
 * visually to the right. The same reason `align` and `pinning` are both `start` / `end`: all
 * three axes flip with the writing direction.
 */
export const ColumnMoveDirection = {
	Start: 'start',
	End: 'end',
} as const

export type ColumnMoveDirection = (typeof ColumnMoveDirection)[keyof typeof ColumnMoveDirection]

/**
 * Which columns count as neighbours for a step.
 *
 * A step always moves a column past what the user can see — but *where* they are looking decides
 * what that means. In the header they see the table, so a hidden column is not a place to land.
 * In the column panel they see a list that includes the hidden ones, and a step that jumped over
 * a row sitting right there would look like it moved two places.
 *
 * **{@link ColumnMoveScope.All} is not a superset of {@link ColumnMoveScope.Visible}, in one
 * case.** Counting a column means the walk stops at it if it is locked, where skipping it meant the
 * walk carried on — so a column that is hidden **and** carries `ordering: false` is a wall under
 * `All` and transparent under `Visible`. On `[a, b(hidden, ordering: false), c, d]`, `a` reaches `c`
 * and `d` in the header and reaches nothing in the panel.
 *
 * Measured and left standing rather than overlooked. Reordering the two checks would make the lock a
 * wall in both scopes and restore the superset, at the cost of a second change to released step
 * behaviour in a phase that was meant to add helpers — bought for a configuration almost nobody
 * writes, since it needs a column to be hidden and pinned in place at the same time. If that
 * configuration ever turns up in earnest, moving the {@link isMovable} check above the visibility
 * skip in `findNeighbourIndex` is the whole fix.
 */
export const ColumnMoveScope = {
	/** Only visible columns. The header's step, and what every caller gets by default. */
	Visible: 'visible',
	/**
	 * Every column, hidden ones included. The column panel's step.
	 *
	 * Wider than {@link ColumnMoveScope.Visible} except against a column that is hidden and locked
	 * together, which this scope stops at and that one walks over. See the note above.
	 */
	All: 'all',
} as const

export type ColumnMoveScope = (typeof ColumnMoveScope)[keyof typeof ColumnMoveScope]

/**
 * Whether this column may be moved at all.
 *
 * Two locks, both per column: a system column (selection / expand / row actions) has a fixed
 * place in the layout, and `ordering: false` on a column def says the author fixed it there.
 *
 * Exported for `./drop`, which applies these two locks to the column a drag picks **up** — the
 * one end {@link isColumnReachableByStepping} cannot speak for, since the walk checks the
 * candidates it arrives at and never the column it started from.
 */
export function isMovable(column: OrderableColumn): boolean {
	const meta = column.columnDef.meta
	return meta?.isSystemColumn !== true && meta?.ordering !== false
}

/** What {@link findNeighbourIndex} answers when there is no neighbour: no index, not a column. */
const NO_NEIGHBOUR = -1

/**
 * The index of the neighbour a move would swap with, or {@link NO_NEIGHBOUR} when there is none.
 *
 * A neighbour has to be **all four** of:
 *
 * - in the same pin group — pinning decides which of the three bands a column sits in, and a
 *   move that crossed a band would look like a pin, not a reorder;
 * - under the same parent header — the header groups are built from the leaf order, so a leaf
 *   dragged into a sibling group splits its parent's header cell in two;
 * - a neighbour under the `scope`: {@link ColumnMoveScope.Visible} passes over hidden columns,
 *   because a step should move the column past what the user can see, and in the table they
 *   cannot see those. {@link ColumnMoveScope.All} counts them, because the column panel lists
 *   them;
 * - {@link isMovable} — a locked column is not a landing spot.
 *
 * **The four fail in two different ways, and that distinction is the whole of the walk below.** A
 * foreign band and a hidden column are **stepped over**; a foreign parent and a locked column
 * **end** the search. Bands are skipped because pinning is orthogonal to the leaf order — a pinned
 * column may sit between two columns of one band, and the user, seeing the bands rendered apart,
 * sees those two adjacent. Parents end it because leaves under one parent are contiguous, so past
 * that boundary there is nothing this column could be a neighbour of. Locks end it because
 * `ordering: false` fixes a column's place, which a move past it would change.
 *
 * Which flavour each boundary has is load-bearing beyond this function: {@link
 * isColumnReachableByStepping} is what `./drop` asks instead of keeping a second copy of these rules, and
 * both times a copy existed it disagreed with this list.
 *
 * Returns an index rather than a column so that the walk can continue from it.
 */
function findNeighbourIndex(
	columns: OrderableColumn[],
	index: number,
	direction: ColumnMoveDirection,
	scope: ColumnMoveScope,
): number {
	const column = columns[index]
	if (!column) return NO_NEIGHBOUR

	const step = direction === ColumnMoveDirection.Start ? -1 : 1
	const parentId = column.parent?.id
	const pinned = pinnedBand(column)

	for (let i = index + step; i >= 0 && i < columns.length; i += step) {
		const candidate = columns[i]
		if (!candidate) continue
		// A different band is **stepped over**, not treated as the end of the order. Pinning is
		// orthogonal to the leaf order, so a pinned column can sit between two columns of the same
		// band — and the user, who sees the bands rendered apart, sees those two side by side. Ending
		// the search here would refuse a step the user has every reason to expect, and it did: it
		// also made the drop path disagree with this one, since a drop compares the bands of its two
		// ends and cannot see what lies between them.
		if (pinnedBand(candidate) !== pinned) continue
		// A different parent still ends the search. Leaves under one parent are contiguous, so what
		// lies beyond one is not this column's neighbour at all — and a leaf dragged into a sibling
		// group would split its parent's header cell in two.
		if (candidate.parent?.id !== parentId) return NO_NEIGHBOUR
		if (scope === ColumnMoveScope.Visible && !isVisible(candidate)) continue
		// A locked candidate ends the walk rather than being stepped over, and that is a decision
		// rather than an omission: `ordering: false` says the author fixed that column *there*, so
		// moving another column past it would change its index and break the promise. The same is
		// true of a system column, whose place in the layout is fixed. `./drop` must honour this —
		// which it does by walking with this function rather than restating its rules.
		return isMovable(candidate) ? i : NO_NEIGHBOUR
	}
	return NO_NEIGHBOUR
}

/**
 * The neighbour a move would swap with, or `undefined` when there is none.
 *
 * See {@link findNeighbourIndex} for the rules; this is the column-shaped answer its callers want.
 */
function findNeighbour(
	columns: OrderableColumn[],
	index: number,
	direction: ColumnMoveDirection,
	scope: ColumnMoveScope,
): OrderableColumn | undefined {
	const neighbour = findNeighbourIndex(columns, index, direction, scope)
	return neighbour === NO_NEIGHBOUR ? undefined : columns[neighbour]
}

/**
 * Whether repeated stepping from `sourceIndex` lands on `targetIndex`.
 *
 * This is what a **drop** is allowed to be: a drag must not produce an arrangement the menu's step
 * entries would have refused, and the only way to be sure of that is to ask the step path itself
 * rather than to restate its rules beside it. Every boundary therefore arrives for free, in
 * whichever flavour {@link findNeighbourIndex} gives it — a foreign band and a hidden column are
 * walked over, a foreign parent and a locked column end the walk — and a rule added there is
 * honoured here without anyone remembering to copy it.
 *
 * Two earlier attempts restated the rules over the two ends instead, and each one shipped a
 * disagreement: the first missed that a pinned column between two same-band siblings was a wall
 * for the step, the second that a locked column was. That is the argument for the walk, and it is
 * worth more than the O(n) it costs over a leaf list.
 *
 * A target the walk steps **over** is unreachable, which is the right answer: a hidden target under
 * {@link ColumnMoveScope.Visible} and a target in another band are both things the user cannot have
 * aimed at in the surface this scope describes.
 */
export function isColumnReachableByStepping(
	columns: OrderableColumn[],
	sourceIndex: number,
	targetIndex: number,
	scope: ColumnMoveScope,
): boolean {
	if (sourceIndex === targetIndex) return false

	const direction = targetIndex > sourceIndex ? ColumnMoveDirection.End : ColumnMoveDirection.Start
	// Terminates because `findNeighbourIndex` only ever looks in `direction`, so each hop moves
	// strictly that way and the list is finite.
	for (let index = sourceIndex; ; ) {
		const neighbour = findNeighbourIndex(columns, index, direction, scope)
		if (neighbour === NO_NEIGHBOUR) return false
		if (neighbour === targetIndex) return true
		index = neighbour
	}
}

/** Whether `columnId` can move one step in `direction` — what a menu entry's disabled state reads. */
export function canMoveColumn(
	table: ColumnOrderingTable,
	columnId: string,
	direction: ColumnMoveDirection,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): boolean {
	const columns = table.getAllLeafColumns()
	const index = columns.findIndex((column) => column.id === columnId)
	const column = columns[index]
	if (!column || !isMovable(column)) return false
	return findNeighbour(columns, index, direction, scope) !== undefined
}

/**
 * The column order that results from moving `columnId` one step in `direction`, or the current
 * order unchanged when the move is not available.
 *
 * Always the **complete** list of leaf ids: TanStack reads a partial `columnOrder` as "these
 * first, then the rest as declared", so writing only the columns that moved would silently
 * reorder every column that did not.
 */
export function moveColumn(
	table: ColumnOrderingTable,
	columnId: string,
	direction: ColumnMoveDirection,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): ColumnOrderState {
	const columns = table.getAllLeafColumns()
	const order = columns.map((column) => column.id)
	const index = columns.findIndex((column) => column.id === columnId)
	const column = columns[index]
	if (!column || !isMovable(column)) return order

	const neighbour = findNeighbour(columns, index, direction, scope)
	if (!neighbour) return order

	const targetIndex = order.indexOf(neighbour.id)
	const next = [...order]
	next.splice(index, 1)
	next.splice(targetIndex, 0, columnId)
	return next
}
