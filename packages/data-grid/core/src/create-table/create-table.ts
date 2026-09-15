import { createTable as createTanStackTable } from '@tanstack/table-core'

import { enforceColumnInvariants } from '../column-state'
import { APPLIED_STATE_KEY } from '../features/deferred-apply'
import { createStore } from '../store'

import { createTableOptions } from './create-table-options'

import type { AppliedState } from '../features/deferred-apply'
import type { DataTable, TableConfig } from '../types'
import type { TableOptionsResolved, TableState, Updater } from '@tanstack/table-core'

/**
 * Creates a headless data-grid table instance wrapping TanStack Table v8.
 *
 * The returned object extends TanStack's Table with:
 * - subscribe / getSnapshot — for useSyncExternalStore
 * - setData — reactive data replacement
 * - Creating / Editing / Deleting / Loading feature methods
 *
 * @example
 * const table = createTable({ data: users, columns, sorting: true })
 */
/** Axes whose deferred draft `syncControlledState` must not let controlled input clobber. */
const DRAFT_AXES = ['sorting', 'columnFilters', 'globalFilter'] as const

export function createTable<TRow extends object>(config: TableConfig<TRow>): DataTable<TRow> {
	const { options: resolvedOptions, initialState, columnInvariants, deferred, onChange } = createTableOptions(config)

	let store = createStore<TableState>({} as TableState)

	// We need a stable reference for the callback closure.
	// Using a wrapper object allows const + mutation inside the closure.
	const ref: { table: ReturnType<typeof createTanStackTable<TRow>> | null } = {
		table: null,
	}

	/**
	 * The snapshot the outside world is allowed to see: the three deferrable axes
	 * replaced by the applied snapshot, and `applied` itself dropped. With
	 * `draft` off this is the identity function.
	 *
	 * The `applied` guard covers the window before the store is rebuilt from
	 * `table.initialState` below, where a state change raised during construction
	 * would otherwise read the slice off an empty snapshot.
	 */
	const toOutward = (state: TableState): TableState => {
		if (!deferred) return state
		const applied = state.applied as AppliedState | undefined
		if (applied === undefined) return state
		const { applied: _dropped, ...rest } = state
		return {
			...rest,
			sorting: applied.sorting,
			columnFilters: applied.columnFilters,
			globalFilter: applied.globalFilter,
		} as TableState
	}

	/**
	 * Reference comparison across **every** slice the outward snapshot carries,
	 * derived from the objects rather than a hand-written list. A slice omitted
	 * from a fixed list would be a state change that silently never reaches the
	 * consumer while `draft` is on — a far worse failure than one extra
	 * emission, and one that grows every time a feature adds a slice.
	 */
	const outwardUnchanged = (a: TableState, b: TableState): boolean => {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)])
		for (const key of keys) {
			if (key === APPLIED_STATE_KEY) continue
			if ((a as unknown as Record<string, unknown>)[key] !== (b as unknown as Record<string, unknown>)[key]) {
				return false
			}
		}
		return true
	}

	/**
	 * With `draft` off there is no draft, so the applied snapshot must track
	 * the live axes — otherwise `table.draft.isDirty()` would report a phantom draft
	 * for every consumer that never opted in. Returns the same object when already
	 * in sync so the funnel's reference comparisons stay meaningful.
	 */
	const syncApplied = (state: TableState): TableState => {
		const applied = state.applied as AppliedState | undefined
		if (
			applied === undefined ||
			(applied.sorting === state.sorting &&
				applied.columnFilters === state.columnFilters &&
				applied.globalFilter === state.globalFilter)
		) {
			return state
		}
		return {
			...state,
			applied: { sorting: state.sorting, columnFilters: state.columnFilters, globalFilter: state.globalFilter },
		}
	}

	const onStateChange = (updater: Updater<TableState>): void => {
		const currentState = store.getState()
		const requested = typeof updater === 'function' ? updater(currentState) : updater
		const enforced = enforceColumnInvariants(requested, columnInvariants)
		const next = deferred ? enforced : syncApplied(enforced)
		ref.table?.setOptions((prev) => ({ ...prev, state: next }))
		store.setState(next)

		const outwardPrev = toOutward(currentState)
		const outwardNext = toOutward(next)

		// A draft edit changes nothing the consumer is allowed to see. Emitting an
		// identical snapshot would be noise at best and a duplicate request at
		// worst, so the funnel stays silent and "onStateChange fired" keeps meaning
		// "the query changed".
		if (deferred && outwardUnchanged(outwardPrev, outwardNext)) return

		config.onStateChange?.(outwardNext)

		// Per-feature onChange — fire only when the relevant sub-state reference actually changed
		if (onChange.sorting && outwardPrev.sorting !== outwardNext.sorting) {
			onChange.sorting(outwardNext.sorting)
		}
		if (onChange.filtering && outwardPrev.columnFilters !== outwardNext.columnFilters) {
			onChange.filtering(outwardNext.columnFilters)
		}
		if (onChange.globalFiltering && outwardPrev.globalFilter !== outwardNext.globalFilter) {
			onChange.globalFiltering(outwardNext.globalFilter)
		}
		if (onChange.pagination && outwardPrev.pagination !== outwardNext.pagination) {
			onChange.pagination(outwardNext.pagination)
		}
		// Selection goes through this funnel like the rest, and deliberately NOT through
		// TanStack's `onRowSelectionChange`: that option *replaces* the built-in state writer
		// (`makeStateUpdater`), so supplying it to carry a callback silently stopped the
		// selection from ever being recorded — `selection: { onChange }` disabled the checkboxes.
		if (onChange.selection && outwardPrev.rowSelection !== outwardNext.rowSelection) {
			const selection = outwardNext.rowSelection
			onChange.selection(
				selection,
				Object.keys(selection).filter((id) => selection[id]),
			)
		}
		if (onChange.visibility && outwardPrev.columnVisibility !== outwardNext.columnVisibility) {
			onChange.visibility(outwardNext.columnVisibility)
		}
		if (onChange.columnOrdering && outwardPrev.columnOrder !== outwardNext.columnOrder) {
			onChange.columnOrdering(outwardNext.columnOrder)
		}
		if (onChange.columnPinning && outwardPrev.columnPinning !== outwardNext.columnPinning) {
			onChange.columnPinning(outwardNext.columnPinning)
		}
		if (onChange.rowPinning && outwardPrev.rowPinning !== outwardNext.rowPinning) {
			onChange.rowPinning(outwardNext.rowPinning)
		}
		// `columnSizing` only — `columnSizingInfo` churns on every pointer move mid-drag.
		if (onChange.resizing && outwardPrev.columnSizing !== outwardNext.columnSizing) {
			onChange.resizing(outwardNext.columnSizing)
		}
		if (onChange.expanding && outwardPrev.expanded !== outwardNext.expanded) {
			onChange.expanding(outwardNext.expanded)
		}
	}

	// Create the table. Features run getInitialState during this call.
	ref.table = createTanStackTable({
		...resolvedOptions,
		state: initialState as TableState,
		onStateChange,
	} as unknown as TableOptionsResolved<TRow>)

	// Initialize store with the fully-merged initial state (includes feature states)
	store = createStore(ref.table.initialState)

	// Switch to fully-controlled mode with the real initial state
	ref.table.setOptions((prev) => ({ ...prev, state: store.getState() }))

	// ── compose the DataTable ─────────────────────────────────────────────────
	const dataTable = ref.table as DataTable<TRow>

	dataTable.subscribe = (listener) => store.subscribe(listener)

	dataTable.getSnapshot = () => store.getState()
	// Frozen at construction: a server render must produce the same tree on every call, so it
	// cannot read a store that a client-side interaction may already have advanced.
	const initialSnapshot = store.getState()
	dataTable.getInitialSnapshot = () => initialSnapshot

	dataTable.setData = (data) => {
		ref.table?.setOptions((prev) => ({
			...prev,
			data,
		}))
		// Create a new snapshot reference so broad useSyncExternalStore subscribers
		// detect the change. Narrow per-slice subscribers do NOT re-render on this
		// (none of the slice references change). The main React adapter syncs
		// `data` via `setOptions` directly in render body; this path remains for
		// programmatic / non-React-driven updates.
		store.setState((prev) => ({ ...prev }))
	}

	dataTable.syncControlledState = (partial, options) => {
		// While a draft is pending, the consumer only ever saw the last APPLIED query —
		// what it mirrors back for the three deferrable axes is stale by construction.
		// Accepting it would silently discard whatever the user is composing.
		const incoming =
			deferred && ref.table?.draft.isDirty() === true
				? (Object.fromEntries(
						Object.entries(partial).filter(([key]) => !(DRAFT_AXES as readonly string[]).includes(key)),
					) as typeof partial)
				: partial
		const safe = enforceColumnInvariants(incoming, columnInvariants)
		ref.table?.setOptions((prev) => ({
			...prev,
			state: { ...prev.state, ...safe },
		}))
		store.setState((prev) => ({ ...prev, ...safe }), options)
	}

	dataTable.notifyStateSubscribers = () => {
		store.notify()
	}

	// Forward infinite scroll: append rows after current data. Immutable — builds a
	// fresh array so broad snapshot subscribers re-render; the previous array is untouched.
	dataTable.appendData = (rows) => {
		const prev = ref.table?.options.data ?? []
		dataTable.setData([...prev, ...rows])
	}

	// Reserved v2 (backward/prepend). No scroll-anchoring in v1.
	dataTable.prependData = (rows) => {
		const prev = ref.table?.options.data ?? []
		dataTable.setData([...rows, ...prev])
	}

	return dataTable
}
