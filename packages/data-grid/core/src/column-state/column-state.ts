import type { MappedColumnDef } from '../column/types'
import type { ColumnPinningState, TableFeatures, TableState } from '@tanstack/table-core'

/**
 * Column-derived rules that **no** state input may violate — not `config.initialState`,
 * not a controlled `state` sync, not a `table.setState` write.
 *
 * They exist because the corresponding UI affordance is deliberately absent: the column
 * menu hides the pin section for statically pinned columns and skips system columns
 * entirely, so a state that unpins or hides them can never be recovered by the user.
 */
export type ColumnInvariants = {
	/** Column ids that must always appear in `columnPinning.start`. */
	readonly forcedStart: readonly string[]
	/** Column ids that must always appear in `columnPinning.end`. */
	readonly forcedEnd: readonly string[]
	/** Column ids that must never be `false` in `columnVisibility`. */
	readonly alwaysVisible: readonly string[]
}

/** Seed pins derived from column defs — `side` (static) and `initialSide` (dynamic). */
export type PinningSeed = {
	readonly start: readonly string[]
	readonly end: readonly string[]
}

function getColumnId<TRow extends object>(col: MappedColumnDef<TRow>): string | undefined {
	return col.id ?? (col as { accessorKey?: string }).accessorKey
}

/**
 * Derives the invariants from the final column list (system columns included).
 *
 * - system columns → always visible, pinned where their meta says so
 * - `pinning: 'start'` / `pinning: { side }` → static pin, always kept
 * - `visibility: false` → hiding disabled, the column can never be hidden
 *
 * `initialSide` is deliberately **not** an invariant: it is only a seed (see
 * {@link mergePinningSeed}) and the user may move or unpin such a column.
 */
export function buildColumnInvariants<TRow extends object>(columns: MappedColumnDef<TRow>[]): ColumnInvariants {
	const forcedStart: string[] = []
	const forcedEnd: string[] = []
	const alwaysVisible: string[] = []

	for (const col of columns) {
		const colId = getColumnId(col)
		if (colId === undefined) continue
		const meta = col.meta
		if (meta?.isSystemColumn === true || meta?.visibility === false) alwaysVisible.push(colId)
		const pin = meta?.pinning === false ? undefined : meta?.pinning?.side
		if (pin === 'start') forcedStart.push(colId)
		else if (pin === 'end') forcedEnd.push(colId)
	}

	return { forcedStart, forcedEnd, alwaysVisible }
}

/**
 * Merges the column-derived pinning seed with a consumer-provided `initialState.columnPinning`.
 *
 * A seeded column the consumer mentions in **either** array is left to the consumer; one it does
 * not mention at all keeps its seed. Unmentioned start seeds go in front and unmentioned end
 * seeds go last so `__selection__` stays outermost at the start edge and `__actions__` at the end.
 */
export function mergePinningSeed(seed: PinningSeed, user: Partial<ColumnPinningState> | undefined): ColumnPinningState {
	if (user === undefined) return { start: [...seed.start], end: [...seed.end] }

	const userStart = user.start ?? []
	const userEnd = user.end ?? []
	const mentioned = new Set([...userStart, ...userEnd])

	return {
		start: [...seed.start.filter((id) => !mentioned.has(id)), ...userStart],
		end: [...userEnd, ...seed.end.filter((id) => !mentioned.has(id))],
	}
}

/**
 * Returns `current` unchanged when it already contains every `forcedHere` id and none of the
 * `forcedOther` ones; otherwise returns a corrected copy. Missing ids are prepended for the
 * start side and appended for the end so forced system columns stay on the outside.
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
export function enforceColumnInvariants<TState extends Partial<TableState<TableFeatures>>>(
	state: TState,
	invariants: ColumnInvariants,
): TState {
	// A state that carries no `columnPinning` at all is left alone: for a partial controlled
	// sync, inventing the slice would overwrite the pins already held in the store.
	const pinning = state.columnPinning
	const start =
		pinning === undefined
			? undefined
			: enforcePinnedSide(pinning.start, invariants.forcedStart, invariants.forcedEnd, true)
	const end =
		pinning === undefined
			? undefined
			: enforcePinnedSide(pinning.end, invariants.forcedEnd, invariants.forcedStart, false)
	const pinningChanged = pinning !== undefined && (start !== pinning.start || end !== pinning.end)

	const visibility = state.columnVisibility
	const hiddenIds = visibility === undefined ? [] : invariants.alwaysVisible.filter((id) => visibility[id] === false)

	if (!pinningChanged && hiddenIds.length === 0) return state

	const next: TState = { ...state }

	if (pinningChanged) {
		// v9's `ColumnPinningState` requires both arrays, so a side that is absent on the way in
		// comes out as `[]` rather than staying a missing key. The types say that cannot happen
		// — `pinningChanged` implies `pinning !== undefined`, and both arrays are required on it
		// — but this takes `Partial<TableState>` and callers cast, so a hand-written
		// `columnPinning` carrying only one array does reach here and has the other reset.
		// That is the right answer for v9: a state missing an array is not a valid one.
		const nextPinning: ColumnPinningState = { start: start ?? [], end: end ?? [] }
		next.columnPinning = nextPinning
	}

	if (hiddenIds.length > 0 && visibility !== undefined) {
		const nextVisibility = { ...visibility }
		for (const id of hiddenIds) nextVisibility[id] = true
		next.columnVisibility = nextVisibility
	}

	return next
}
