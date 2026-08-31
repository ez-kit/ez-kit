import type { TanStackColumnDef } from '../column/types'
import type { ColumnPinningState, TableState } from '@tanstack/table-core'

/**
 * Column-derived rules that **no** state input may violate — not `config.initialState`,
 * not a controlled `state` sync, not a `table.setState` write.
 *
 * They exist because the corresponding UI affordance is deliberately absent: the column
 * menu hides the pin section for statically pinned columns and skips system columns
 * entirely, so a state that unpins or hides them can never be recovered by the user.
 */
export type ColumnInvariants = {
	/** Column ids that must always appear in `columnPinning.left`. */
	readonly forcedLeft: readonly string[]
	/** Column ids that must always appear in `columnPinning.right`. */
	readonly forcedRight: readonly string[]
	/** Column ids that must never be `false` in `columnVisibility`. */
	readonly alwaysVisible: readonly string[]
}

/** Seed pins derived from column defs — `side` (static) and `initialSide` (dynamic). */
export type PinningSeed = {
	readonly left: readonly string[]
	readonly right: readonly string[]
}

function getColumnId<TRow extends object>(col: TanStackColumnDef<TRow>): string | undefined {
	return col.id ?? (col as { accessorKey?: string }).accessorKey
}

/**
 * Derives the invariants from the final column list (system columns included).
 *
 * - system columns → always visible, pinned where their meta says so
 * - `pinning: 'left'` / `pinning: { side }` → static pin, always kept
 * - `visibility: false` → hiding disabled, the column can never be hidden
 *
 * `initialSide` is deliberately **not** an invariant: it is only a seed (see
 * {@link mergePinningSeed}) and the user may move or unpin such a column.
 */
export function buildColumnInvariants<TRow extends object>(columns: TanStackColumnDef<TRow>[]): ColumnInvariants {
	const forcedLeft: string[] = []
	const forcedRight: string[] = []
	const alwaysVisible: string[] = []

	for (const col of columns) {
		const colId = getColumnId(col)
		if (colId === undefined) continue
		const meta = col.meta
		if (meta?.isSystemColumn === true || meta?.visibility === false) alwaysVisible.push(colId)
		const pin = meta?.pinning === false ? undefined : meta?.pinning?.side
		if (pin === 'left') forcedLeft.push(colId)
		else if (pin === 'right') forcedRight.push(colId)
	}

	return { forcedLeft, forcedRight, alwaysVisible }
}

/**
 * Merges the column-derived pinning seed with a consumer-provided `initialState.columnPinning`.
 *
 * A seeded column the consumer mentions in **either** array is left to the consumer; one it does
 * not mention at all keeps its seed. Unmentioned left seeds go in front and unmentioned right
 * seeds go last so `__selection__` stays leftmost and `__actions__` rightmost.
 */
export function mergePinningSeed(seed: PinningSeed, user: ColumnPinningState | undefined): ColumnPinningState {
	if (user === undefined) return { left: [...seed.left], right: [...seed.right] }

	const userLeft = user.left ?? []
	const userRight = user.right ?? []
	const mentioned = new Set([...userLeft, ...userRight])

	return {
		left: [...seed.left.filter((id) => !mentioned.has(id)), ...userLeft],
		right: [...userRight, ...seed.right.filter((id) => !mentioned.has(id))],
	}
}

/**
 * Returns `current` unchanged when it already contains every `forcedHere` id and none of the
 * `forcedOther` ones; otherwise returns a corrected copy. Missing ids are prepended for the
 * left side and appended for the right so forced system columns stay on the outside.
 */
function enforcePinnedSide(
	current: string[] | undefined,
	forcedHere: readonly string[],
	forcedOther: readonly string[],
	prepend: boolean,
): string[] | undefined {
	const kept = current === undefined ? [] : current.filter((id) => !forcedOther.includes(id))
	const missing = forcedHere.filter((id) => !kept.includes(id))
	if (missing.length === 0) {
		if (current === undefined) return undefined
		return kept.length === current.length ? current : kept
	}
	return prepend ? [...missing, ...kept] : [...kept, ...missing]
}

/**
 * Forces `state` to satisfy `invariants`.
 *
 * Returns the **same reference** when nothing had to change — both `onStateChange` and the
 * React adapter compare slice references to decide whether to fire callbacks or re-sync, so a
 * gratuitous clone would cause spurious updates.
 */
export function enforceColumnInvariants<TState extends Partial<TableState>>(
	state: TState,
	invariants: ColumnInvariants,
): TState {
	// A state that carries no `columnPinning` at all is left alone: for a partial controlled
	// sync, inventing the slice would overwrite the pins already held in the store.
	const pinning = state.columnPinning
	const left =
		pinning === undefined
			? undefined
			: enforcePinnedSide(pinning.left, invariants.forcedLeft, invariants.forcedRight, true)
	const right =
		pinning === undefined
			? undefined
			: enforcePinnedSide(pinning.right, invariants.forcedRight, invariants.forcedLeft, false)
	const pinningChanged = pinning !== undefined && (left !== pinning.left || right !== pinning.right)

	const visibility = state.columnVisibility
	const hiddenIds = visibility === undefined ? [] : invariants.alwaysVisible.filter((id) => visibility[id] === false)

	if (!pinningChanged && hiddenIds.length === 0) return state

	const next: TState = { ...state }

	if (pinningChanged) {
		const nextPinning: ColumnPinningState = {}
		if (left !== undefined) nextPinning.left = left
		if (right !== undefined) nextPinning.right = right
		next.columnPinning = nextPinning
	}

	if (hiddenIds.length > 0 && visibility !== undefined) {
		const nextVisibility = { ...visibility }
		for (const id of hiddenIds) nextVisibility[id] = true
		next.columnVisibility = nextVisibility
	}

	return next
}
