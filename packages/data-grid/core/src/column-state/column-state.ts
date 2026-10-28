import type { MappedColumnDef } from '../column/types'
import type { ColumnPinningState, TableFeatures, TableState } from '@tanstack/table-core'

/**
 * Column-derived rules that **no** state input may violate — not `config.initialState`,
 * not a controlled `state` sync, not a `table.setState` write.
 *
 * They exist because the corresponding UI affordance is deliberately absent: the column
 * menu hides the pin section for statically pinned columns and skips system columns
 * entirely, so a state that unpins or hides them can never be recovered by the user.
 *
 * `createTableOptions` enforces them on the seed and in the slice handlers; a controlled
 * `state`, which `useDataGrid` publishes straight into the base atoms, goes through
 * `table.grid.columnState.enforce` first. Persisting runs the inverse, `strip`.
 */
export type ColumnInvariants = {
	/** Column ids that must always appear in `columnPinning.start`, and in a non-empty `columnOrder`. */
	readonly forcedStart: readonly string[]
	/** Column ids that must always appear in `columnPinning.end`, and in a non-empty `columnOrder`. */
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

/** Whether two id lists hold the same ids in the same order. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * `ids` with the `leading` forced ids first and the `trailing` ones last, each group in its
 * declared order, and none of the `excluded` ones anywhere; the ids in between keep their order.
 * Returns `ids` itself when it already has that shape.
 *
 * Forced columns sit on the **outside** of their side, whatever wrote the list: TanStack's own
 * `column.pin('end')` appends after `__actions__`, so without this a column the user pins to the
 * end would land beyond the actions column — and a persisted state, which drops the forced ids,
 * could not say which side of them it was on.
 */
function withForcedAtEdges(
	ids: string[],
	leading: readonly string[],
	trailing: readonly string[],
	excluded: readonly string[],
): string[] {
	const middle = ids.filter((id) => !leading.includes(id) && !trailing.includes(id) && !excluded.includes(id))
	const arranged = [...leading, ...middle, ...trailing]
	return sameIds(arranged, ids) ? ids : arranged
}

/**
 * One pinning side with its forced ids on the outside and the other side's forced ids removed.
 * An absent side stays absent unless it has forced ids to hold.
 */
function enforcePinnedSide(
	current: string[] | undefined,
	forcedHere: readonly string[],
	forcedOther: readonly string[],
	isStart: boolean,
): string[] | undefined {
	if (current === undefined && forcedHere.length === 0) return undefined
	const ids = current ?? []
	const next = isStart
		? withForcedAtEdges(ids, forcedHere, [], forcedOther)
		: withForcedAtEdges(ids, [], forcedHere, forcedOther)
	return current !== undefined && next === ids ? current : next
}

/**
 * A non-empty `columnOrder` with the forced start ids first and **no** forced end ids. An empty
 * one is the declared order, which already places every column, and is returned as given.
 *
 * The two edges are kept differently because TanStack appends every column a non-empty order
 * omits, in declared order. A start id must be listed or it would land at the end; an end id must
 * **not** be, because the system columns are declared last (`buildColumnList`), so leaving them
 * out is what keeps them last — after any column the stored order predates as well, which a
 * listed `__actions__` would put after itself. Either way the cost of getting it wrong is the
 * same: the rendered pin region comes from `columnPinning` and stays right, but every index
 * `moveColumn` / `dropColumn` and the ARIA offsets compute would come from the wrong order.
 */
function enforceColumnOrder(order: string[], invariants: ColumnInvariants): string[] {
	if (order.length === 0) return order
	return withForcedAtEdges(order, invariants.forcedStart, [], invariants.forcedEnd)
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

	const order = state.columnOrder
	const nextOrder = order === undefined ? undefined : enforceColumnOrder(order, invariants)
	const orderChanged = nextOrder !== order

	if (!pinningChanged && hiddenIds.length === 0 && !orderChanged) return state

	const next: TState = { ...state }

	if (orderChanged && nextOrder !== undefined) next.columnOrder = nextOrder

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

/**
 * `ids` without any of `dropped`, or `ids` itself when it holds none of them. Takes `undefined`
 * for the reason `enforceColumnInvariants` gives — callers cast, so a hand-written `columnPinning`
 * carrying one array does reach here — and returns `[]` for it, so both arrays come out.
 */
function withoutIds(ids: string[] | undefined, dropped: ReadonlySet<string>): string[] {
	if (ids === undefined) return []
	return ids.some((id) => dropped.has(id)) ? ids.filter((id) => !dropped.has(id)) : ids
}

/**
 * The inverse of {@link enforceColumnInvariants}: removes what it would put back.
 *
 * Forced ids leave `columnPinning` and `columnOrder`, always-visible ids leave `columnVisibility`.
 * What remains is what the user chose — the state worth persisting, since every input path restores
 * the rest. A system column that is **not** forced (`initialSide`, `pinning: false`) is the user's
 * to place, so it stays.
 *
 * Same reference contract as `enforceColumnInvariants`, for the state and for every slice: a slice
 * with nothing to drop is returned as given, and a slice the state does not carry is not invented.
 */
export function stripColumnInvariants<TState extends Partial<TableState<TableFeatures>>>(
	state: TState,
	invariants: ColumnInvariants,
): TState {
	const forced = new Set([...invariants.forcedStart, ...invariants.forcedEnd])

	const pinning = state.columnPinning
	const start = pinning === undefined ? undefined : withoutIds(pinning.start, forced)
	const end = pinning === undefined ? undefined : withoutIds(pinning.end, forced)
	const pinningChanged = pinning !== undefined && (start !== pinning.start || end !== pinning.end)

	const order = state.columnOrder
	const nextOrder = order === undefined ? undefined : withoutIds(order, forced)
	const orderChanged = nextOrder !== order

	const visibility = state.columnVisibility
	const visibleIds =
		visibility === undefined ? [] : invariants.alwaysVisible.filter((id) => Object.hasOwn(visibility, id))

	if (!pinningChanged && !orderChanged && visibleIds.length === 0) return state

	const next: TState = { ...state }
	if (pinningChanged && start !== undefined && end !== undefined) next.columnPinning = { start, end }
	if (orderChanged && nextOrder !== undefined) next.columnOrder = nextOrder
	if (visibleIds.length > 0 && visibility !== undefined) {
		next.columnVisibility = Object.fromEntries(Object.entries(visibility).filter(([id]) => !visibleIds.includes(id)))
	}
	return next
}

/** A state the column invariants read — any partial of the table's, its slices optional. */
type ColumnStateInput = Partial<TableState<TableFeatures>>

/**
 * The column invariants of one table, bound — what `table.grid.columnState` holds.
 *
 * The invariants themselves stay private: which columns are forced follows from the config, and
 * naming the lists would make their shape public API for no reader outside this repository.
 */
export type ColumnStateApi = {
	/**
	 * Puts back what the column config forces: forced pins on their side of `columnPinning`, the
	 * same columns at the edges of a non-empty `columnOrder`, and `true` for every column
	 * `columnVisibility` may not hide. Every input path runs it — `initialState`, a slice write and
	 * a controlled `state`.
	 */
	enforce: <TState extends ColumnStateInput>(state: TState) => TState
	/**
	 * Removes what {@link ColumnStateApi.enforce} would put back, leaving only what the user chose —
	 * the state worth persisting. `enforce(strip(s))` restores `s` for any state the grid reached
	 * through its own gestures and writes.
	 */
	strip: <TState extends ColumnStateInput>(state: TState) => TState
	/**
	 * Equal for two tables exactly when their column invariants are — the key a cache of
	 * `enforce` / `strip` results needs beside its inputs. This object is rebuilt with the table
	 * options, on every render under `useDataGrid`, so its identity says nothing; a config change
	 * that adds or removes a forced column changes this string.
	 */
	readonly signature: string
}

/** Binds {@link enforceColumnInvariants} and {@link stripColumnInvariants} to one table's invariants. */
export function createColumnStateApi(invariants: ColumnInvariants): ColumnStateApi {
	return {
		enforce: (state) => enforceColumnInvariants(state, invariants),
		strip: (state) => stripColumnInvariants(state, invariants),
		signature: JSON.stringify([invariants.forcedStart, invariants.forcedEnd, invariants.alwaysVisible]),
	}
}
