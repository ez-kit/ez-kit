import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import {
	assignTableInstanceData,
	readForeignSlice,
	readOwnSlice,
	writeForeignSlice,
	writeOwnSlice,
} from '../../feature-state'

import type { AnyTable, SliceOf } from '../../feature-state'
import type { FeatureToggle } from '../../utils/feature-flag'
import type {
	ColumnFiltersState,
	ExternalAtoms_All,
	PaginationState,
	RowData,
	SortingState,
	TableFeature,
	TableFeatures,
	Updater,
} from '@tanstack/table-core'

/**
 * The three query axes whose application can be deferred. The members are the TanStack state
 * slice names, so an axis doubles as the key into `AppliedState` / `PendingCount`.
 *
 * Named members for internal reference; the plain string union is what callers see.
 */
export const DraftAxis = {
	/** Column sort order. */
	Sorting: 'sorting',
	/** Per-column filters. */
	ColumnFilters: 'columnFilters',
	/** The cross-column global search value. */
	GlobalFilter: 'globalFilter',
} as const

export type DraftAxis = (typeof DraftAxis)[keyof typeof DraftAxis]

/** The three axes as an iterable, for the loops that have to touch each one. */
const DRAFT_AXES = [DraftAxis.Sorting, DraftAxis.ColumnFilters, DraftAxis.GlobalFilter] as const

/**
 * Snapshot of the query the consumer last saw. The live `sorting` /
 * `columnFilters` / `globalFilter` slices hold what the user is composing;
 * this holds what was actually emitted. The difference between the two is the
 * draft.
 */
export type AppliedState = {
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: unknown
}

/** What `table.draft.get()` returns — the live values of the three axes. */
export type QueryDraft = AppliedState

/**
 * How much is pending on each of the three {@link DraftAxis} axes.
 *
 * Keyed by the axis, like {@link AppliedState} — so `getPendingCount()[axis]` is a legal thing
 * to write, which is what {@link DraftAxis}'s contract has always claimed. The keys used to be
 * `sorting` / `filters` / `search`, which gave one axis three spellings between the state slice,
 * this count and the table option, and made `pending[DraftAxis.ColumnFilters]` a type error.
 *
 * `globalFilter` counts rather than flags, for the same reason: a field whose type changed from
 * `number` to `boolean` halfway across a three-key object cannot be summed, compared or rendered
 * by one branch. It is only ever `0` or `1`.
 */
export type PendingCount = {
	[TAxis in DraftAxis]: number
}

/**
 * Table-level draft config.
 *
 * Carries nothing but the shared {@link FeatureToggle} today: the feature has no knobs, and
 * inventing some to justify an object would be speculative. It exists so `draft` reads like
 * every other feature switch — `draft: { enabled: false }` turns off a `draft` inherited from
 * a defaults layer, which the bare boolean this replaced could not express — and so the first
 * real option can be added without a breaking change.
 */
export type DraftConfig = FeatureToggle

export type DraftApi = {
	get: () => QueryDraft
	set: (next: Partial<QueryDraft>) => void
	isDirty: () => boolean
	getPendingCount: () => PendingCount
	apply: () => void
	reset: () => void
	resetAxis: (axis: DraftAxis) => void
}

/**
 * The consumer's per-axis callbacks for the three deferred axes, fired by {@link DraftApi.apply}.
 *
 * A **second** channel beside `on<Slice>Change`, and it exists because the deferred axes have no
 * write to hang a notification on at the moment the consumer must be told. `createTableOptions`
 * hangs `sorting.onChange` / `filtering.onChange` / `globalFiltering.onChange` on
 * `onSortingChange` / `onColumnFiltersChange` / `onGlobalFilterChange`, which fire on every live
 * edit — exactly what deferral exists to suppress. So under `draft` those three are **not** wired
 * there; they arrive here instead, and `apply()` calls them with the value it just applied. The
 * live write still happens (the atom moves on every keystroke); only the notification moves.
 *
 * Keyed by {@link DraftAxis}, like {@link AppliedState} and {@link PendingCount} — one axis, one
 * spelling, at every level.
 */
export type DraftApplyHandlers = {
	sorting?: ((next: SortingState) => void) | undefined
	columnFilters?: ((next: ColumnFiltersState) => void) | undefined
	globalFilter?: ((next: unknown) => void) | undefined
}

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		draftFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		draftFeature: { applied: AppliedState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. A feature that augments
	// only the first cannot name its own slice at `readOwnSlice(table, 'applied')`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		applied?: AppliedState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		draftFeature: {
			/**
			 * Mirrors `TableConfig.draft`, resolved to a plain boolean. Present and `true` only
			 * when deferral is on, so a UI layer can gate the draft controls on the option itself
			 * rather than inferring it from state — and so this feature can tell "registered and
			 * on" from "registered and off", which is the difference between a pending draft and
			 * no draft at all.
			 */
			draft?: boolean
			/**
			 * The deferred half of the per-axis notifications. See {@link DraftApplyHandlers}.
			 *
			 * A separate key rather than a field of an object-shaped `draft`, because six sites in
			 * the React layer gate the draft UI on `table.options.draft === true` — and `{} === true`
			 * is `false`, so widening `draft` to an object would make the draft bar, the filter
			 * chips and the pending-sort indicator silently **disappear** on every deferring grid.
			 * Two keys, each with one job.
			 */
			onDraftApply?: DraftApplyHandlers
		}
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		draftFeature: {
			/** Composing, applying and backing out the deferred query. */
			draft: DraftApi
		}
	}
}

/** Reference-and-value comparison good enough for the three axes we track. */
function sameAxis(a: unknown, b: unknown): boolean {
	if (a === b) return true
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/** Key of the applied-snapshot slice on `TableState` — never part of an outward emission. */
export const APPLIED_STATE_KEY = 'applied'

export const DEFAULT_APPLIED_STATE: AppliedState = {
	sorting: [],
	columnFilters: [],
	globalFilter: undefined,
}

/**
 * The seeds {@link createDraftAtoms} needs, read off the table's `initialState`.
 *
 * Exactly the four fields it reads, rather than `Partial<TableState_All>` plus `draft`: the
 * caller hands in `TableConfig['initialState']`, whose `pagination` is a `Partial` that
 * `TableState_All` does not accept, so the wider type would only have forced a cast at the one
 * call site that matters.
 */
export type DraftSeed = Partial<AppliedState> & {
	/** Restored draft — seeds the live axes on top of the applied seed. */
	draft?: Partial<AppliedState> | undefined
}

/**
 * Create the three live draft atoms from a table initial state.
 *
 * The **applied** seed is `initialState.sorting` / `.columnFilters` / `.globalFilter` — a grid
 * given an initial sort must not be born dirty. The **live** seed is `initialState.draft`, laid
 * on top, which is how a draft restored from storage comes back pending. Where `draft` says
 * nothing, the live atom starts at the applied value. This is exactly the rule the feature's
 * `getInitialState` encodes for the `applied` slice; the two read the same object and must not
 * disagree.
 *
 * **Call once per table instance, never per render:** `useTable` merges the options object into
 * the table on every render and replaces `atoms` wholesale, so a fresh set each render would
 * reset the draft on every keystroke.
 *
 * The atoms are made through `storeReactivityBindings()`, whose `createWritableAtom` is a thin
 * wrapper over `@tanstack/store`'s `createAtom` — reached through the binding `table-core`
 * already ships rather than by taking a direct dependency on `@tanstack/store` for one call and
 * one type. Under the vanilla binding these atoms are used as they are; `reactReactivity()` sets
 * `wrapExternalAtoms` and two-way mirrors them into its own (`constructTable.js:52-68`). Both are
 * correct, and neither requires this function to know which is in play.
 */
export function createDraftAtoms(initialState?: DraftSeed): DraftAtoms {
	const { createWritableAtom } = storeReactivityBindings()
	const applied = appliedSeed(initialState)
	const draft = initialState?.draft
	return {
		sorting: createWritableAtom<SortingState>(draft?.sorting ?? applied.sorting),
		columnFilters: createWritableAtom<ColumnFiltersState>(draft?.columnFilters ?? applied.columnFilters),
		globalFilter: createWritableAtom<unknown>(
			draft !== undefined && 'globalFilter' in draft ? draft.globalFilter : applied.globalFilter,
		),
	}
}

/**
 * The three atoms {@link createDraftAtoms} returns.
 *
 * Derived from `ExternalAtoms_All` rather than declared structurally or inferred, and the choice is
 * load-bearing in two ways.
 *
 * **It is the type `options.atoms` requires**, narrowed to the three keys this feature owns, so the
 * members cannot merely *resemble* what the table will accept — they are picked from it. `Required`
 * because `ExternalAtoms_All` is a `Partial` (per-slice ownership is optional in general) while
 * `createDraftAtoms` always returns all three.
 *
 * **And it keeps this package's emitted `.d.ts` portable without taking a dependency on
 * `@tanstack/store`.** The member type is that package's `Atom<T>` — `createWritableAtom` is
 * declared `<T>(value: T, options?) => Atom<T>` — which `@tanstack/table-core` imports but does not
 * re-export. Naming `Atom` here, or letting the return type be inferred, made `tsc` write
 * `import('@tanstack/store').Atom<…>` into the declaration for a package that is not a dependency
 * here: a `TS2742` under pnpm's strict layout, and a module a consumer could not have resolved
 * either. Written this way the declaration names only `@tanstack/table-core`, which both we and the
 * consumer already have. See the note in `package.json`'s dependency list — adding the package
 * instead was tried and rejected, because it moved two unrelated resolutions in the lockfile.
 */
export type DraftAtoms = Required<Pick<ExternalAtoms_All, 'sorting' | 'columnFilters' | 'globalFilter'>>

/** The applied half of a seed — what the consumer wrote for the three axes, with defaults. */
function appliedSeed(seed?: DraftSeed): AppliedState {
	return {
		sorting: seed?.sorting ?? DEFAULT_APPLIED_STATE.sorting,
		columnFilters: seed?.columnFilters ?? DEFAULT_APPLIED_STATE.columnFilters,
		globalFilter: seed?.globalFilter,
	}
}

/**
 * A table, as this feature's free functions see it.
 *
 * `AnyTable` carries the two atom bags and `options`; the two extra members are the batching
 * primitive every multi-slice write goes through and the construction-time snapshot
 * `resetTableInstanceData` restores from.
 */
type DraftTable = AnyTable & {
	readonly _reactivity: { batch: (fn: () => void) => void }
	readonly initialState: { applied?: AppliedState }
}

/**
 * Is deferral actually on for this table?
 *
 * The feature can be registered and the option off — a shared grid with a wide feature set
 * switching `draft` off at one use site is the documented shape — and the two must not behave
 * alike. Registered-and-off means there is **no draft**: the live axes are ordinary table state
 * with no external atom over them, `applied` is seeded once and never moves, and reporting the
 * gap between the two as a pending draft would hand every such grid a phantom one. So
 * {@link DraftApi.isDirty} is `false` and {@link DraftApi.getPendingCount} is all zeros there,
 * rather than the applied snapshot being dragged along behind the live axes to make the
 * subtraction come out right — which is what v8's `syncApplied` did, from inside the funnel that
 * no longer exists.
 *
 * Read off `options` rather than off the presence of an external atom: `options.atoms.sorting` is
 * something a consumer may legitimately supply for reasons of their own, and it would then read
 * as "the draft is on".
 */
const isDeferred = (table: { readonly options: object }): boolean =>
	(table.options as { draft?: boolean }).draft === true

/** The consumer's per-axis callbacks, read off a table whose `TFeatures` is unresolved. */
const applyHandlers = (table: { readonly options: object }): DraftApplyHandlers =>
	(table.options as { onDraftApply?: DraftApplyHandlers }).onDraftApply ?? {}

/**
 * The live value of one axis.
 *
 * `readForeignSlice`, deliberately, and this is the one place in the package where the accessor's
 * name and the ownership story do not line up — so it is worth stating which one the accessor is
 * named for. The **slice** belongs to `rowSortingFeature` / `columnFilteringFeature` /
 * `globalFilteringFeature`, each of which is legitimately optional: `tableFeatures({
 * rowSortingFeature, draftFeature })` is a valid draft grid with no `columnFilters` slice at all,
 * and `readOwnSlice` would throw on it. What this feature owns is the **atom** under the slice,
 * when deferral is on — and that ownership is exactly what `readForeignSlice` already honours,
 * because it reads `table.atoms[key]`, the derived atom, whose precedence is
 * `options.atoms[key]` > `options.state[key]` > `baseAtoms[key]`. Reaching for the `DraftAtoms`
 * handle instead would read an atom that is disconnected from the table whenever the axis's own
 * feature is absent, and would need a second code path for the registered-and-off case.
 */
function readAxis<TAxis extends DraftAxis>(table: AnyTable, axis: TAxis): QueryDraft[TAxis] {
	// Widened to `unknown` first: `SliceOf<TAxis>` is unresolved while `TAxis` is a type
	// parameter, so the two narrowings below are what turn one slice union into the axis's own type.
	const value: unknown = readForeignSlice(table, axis)
	if (axis === DraftAxis.GlobalFilter) return value as QueryDraft[TAxis]
	return (value ?? []) as QueryDraft[TAxis]
}

/**
 * Write one axis.
 *
 * `writeForeignSlice` for the mirror image of {@link readAxis}' reason, plus one this feature
 * depends on: it routes through `options.on<Slice>Change`, falling back to `makeStateUpdater`,
 * and **both** resolve `options.atoms[key] ?? baseAtoms[key]`. So the write lands on the external
 * draft atom when deferral is on and on the base atom when it is not, with no branch here. A
 * hand-written `baseAtoms[key].set(…)` would go nowhere in the first case, silently.
 */
function writeAxis<TAxis extends DraftAxis>(table: AnyTable, axis: TAxis, value: QueryDraft[TAxis]): void {
	// The updater is given in functional form: `globalFilter` is `unknown`, and a function-valued
	// global filter handed over as a bare value would be mistaken for an updater by
	// `functionalUpdate`.
	//
	// The assertion restates the axis's own slice type rather than erasing it: `SliceOf<TAxis>` is
	// unresolved while `TAxis` is a type parameter, so the checker cannot see that
	// `QueryDraft[TAxis]` is the same type — which it is, key by key, for all three axes.
	writeForeignSlice(table, axis, (() => value) as Updater<SliceOf<TAxis>>)
}

/** The applied snapshot. `applied` is this feature's own slice, so the read is not optional. */
function readApplied(table: AnyTable): AppliedState {
	return readOwnSlice(table, APPLIED_STATE_KEY)
}

/** The one table member this feature installs — a namespace object, not a method. */
function createDraftApi(table: DraftTable): DraftApi {
	const get = (): QueryDraft => ({
		sorting: readAxis(table, DraftAxis.Sorting),
		columnFilters: readAxis(table, DraftAxis.ColumnFilters),
		globalFilter: readAxis(table, DraftAxis.GlobalFilter),
	})

	const isDirty = (): boolean => {
		if (!isDeferred(table)) return false
		const applied = readApplied(table)
		const live = get()
		return (
			!sameAxis(live.sorting, applied.sorting) ||
			!sameAxis(live.columnFilters, applied.columnFilters) ||
			!sameAxis(live.globalFilter, applied.globalFilter)
		)
	}

	const getPendingCount = (): PendingCount => {
		if (!isDeferred(table)) return { sorting: 0, columnFilters: 0, globalFilter: 0 }
		const applied = readApplied(table)
		const live = get()
		const changedFilters = live.columnFilters.filter(
			(f) =>
				!sameAxis(
					f,
					applied.columnFilters.find((a) => a.id === f.id),
				),
		).length
		const removedFilters = applied.columnFilters.filter((a) => !live.columnFilters.some((f) => f.id === a.id)).length
		const changedSorts = live.sorting.filter((s, i) => !sameAxis(s, applied.sorting[i])).length
		const removedSorts = Math.max(applied.sorting.length - live.sorting.length, 0)
		return {
			sorting: changedSorts + removedSorts,
			columnFilters: changedFilters + removedFilters,
			globalFilter: sameAxis(live.globalFilter, applied.globalFilter) ? 0 : 1,
		}
	}

	const set = (next: Partial<QueryDraft>): void => {
		table._reactivity.batch(() => {
			if (next.sorting !== undefined) writeAxis(table, DraftAxis.Sorting, next.sorting)
			if (next.columnFilters !== undefined) writeAxis(table, DraftAxis.ColumnFilters, next.columnFilters)
			if ('globalFilter' in next) writeAxis(table, DraftAxis.GlobalFilter, next.globalFilter)
		})
	}

	// One batch on purpose: the pageIndex reset, the selection clear and the snapshot move must
	// land in a single state change, or `table.store` notifies three times and the consumer fires
	// three requests — the exact thing this feature exists to prevent.
	//
	// A clean draft (nothing pending) is a no-op: the guard below returns before touching
	// `pagination` / `rowSelection`, so a stray or double-clicked apply() neither re-emits an
	// identical query nor silently clears the user's selection or jumps them back to page 1.
	const apply = (): void => {
		if (!isDirty()) return
		// Read **before** the batch: this is what each handler is gated against below, and the
		// write inside the batch is what moves it.
		const prev = readApplied(table)
		const next = get()
		table._reactivity.batch(() => {
			writeOwnSlice(table, APPLIED_STATE_KEY, next)
			// Both foreign, and both features are optional: a draft grid with neither pagination
			// nor selection is legal, and `writeOwnSlice` would throw on it. `writeForeignSlice`
			// no-ops instead, which is the whole own/foreign asymmetry.
			writeForeignSlice(table, 'pagination', (prev: PaginationState) => ({ ...prev, pageIndex: 0 }))
			writeForeignSlice(table, 'rowSelection', {})
		})
		// The consumer's per-axis callbacks. Outside the batch: they are notifications, not
		// writes, and firing them inside one would let a handler that writes back re-enter the
		// batch it was triggered from.
		//
		// **One handler per axis that actually moved**, which is the guard v8's funnel carried
		// (`if (onChange.sorting && outwardPrev.sorting !== outwardNext.sorting)`). `isDirty()` is
		// true when *any* axis is pending, so firing all three would tell a consumer who typed in
		// the search box that their sorting changed — a second request, or a redundant URL write,
		// on the channel refetches are wired to. `globalFilter` is the worst of the three: it
		// would fire with `undefined` on every apply of a grid that never had a search.
		const handlers = applyHandlers(table)
		if (!sameAxis(next.sorting, prev.sorting)) handlers.sorting?.(next.sorting)
		if (!sameAxis(next.columnFilters, prev.columnFilters)) handlers.columnFilters?.(next.columnFilters)
		if (!sameAxis(next.globalFilter, prev.globalFilter)) handlers.globalFilter?.(next.globalFilter)
	}

	const reset = (): void => {
		const applied = readApplied(table)
		table._reactivity.batch(() => {
			for (const axis of DRAFT_AXES) writeAxis(table, axis, applied[axis])
		})
	}

	const resetAxis = (axis: DraftAxis): void => {
		writeAxis(table, axis, readApplied(table)[axis])
	}

	return { get, set, isDirty, getPendingCount, apply, reset, resetAxis }
}

/**
 * The state the outside world is allowed to see: the three deferrable axes replaced by the
 * applied snapshot, and `applied` itself dropped.
 *
 * Reached only through {@link createAppliedEmitter}, because `createTable` — not this module —
 * owns the `config.onStateChange` subscription, and the projection is the half of it that has to
 * read `applied`.
 *
 * The `applied` guard covers a table on which this feature is registered but which is not
 * deferring: there the snapshot is seeded once and never moves, so projecting through it would
 * emit a query the user changed three keystrokes ago. `createTable` gates on the same fact from
 * the other side, by only building the filter when it built the atoms.
 *
 * An axis is replaced only where the state already carries it. A draft grid may register just one
 * of the three filtering features — `tableFeatures({ rowSortingFeature, draftFeature })` is a
 * legal one — and writing all three unconditionally would put slices into the emitted state that
 * the table does not have, which is the same defect in the opposite direction from dropping one.
 */
function toApplied<TState extends object>(state: TState): TState {
	const applied = (state as { applied?: AppliedState }).applied
	if (applied === undefined) return state
	const { [APPLIED_STATE_KEY]: _dropped, ...rest } = state as Record<string, unknown>
	for (const axis of DRAFT_AXES) {
		if (axis in rest) rest[axis] = applied[axis]
	}
	return rest as TState
}

/**
 * Reference comparison across **every** slice the outward snapshot carries, derived from the
 * objects rather than a hand-written list. A slice omitted from a fixed list would be a state
 * change that silently never reaches the consumer while `draft` is on — a far worse failure than
 * one extra emission, and one that grows every time a feature adds a slice.
 */
function outwardUnchanged(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	for (const key of keys) {
		if (a[key] !== b[key]) return false
	}
	return true
}

/**
 * The outward-emission filter for a deferring table.
 *
 * Returns the state to hand the consumer, or `undefined` when nothing they are allowed to see has
 * moved. A draft edit changes exactly one thing — a live axis the projection replaces — so it
 * compares equal and stays silent, and "onStateChange fired" keeps meaning "the query changed"
 * rather than "the user typed". Every other slice still emits while a draft is pending:
 * `columnVisibility`, `rowSelection`, `expanded` and the rest are not deferred and never were.
 *
 * Stateful by necessity — the comparison is against the last projection, not against the
 * previous store value, because the two differ precisely when a draft is pending. Built with the
 * state as of construction, so the first real change is compared against something.
 *
 * Only `createTable` builds one, and only when it built the atoms: see {@link toApplied}.
 */
export function createAppliedEmitter<TState extends object>(initial: TState): (state: TState) => TState | undefined {
	let last = toApplied(initial)
	return (state: TState): TState | undefined => {
		const next = toApplied(state)
		const prev = last
		last = next
		if (outwardUnchanged(prev as Record<string, unknown>, next as Record<string, unknown>)) return undefined
		return next
	}
}

/**
 * The deferred query, as a v9 table feature.
 *
 * Owns the `applied` slice — the snapshot the consumer last saw — and installs one namespace
 * object, `table.draft`. What it does **not** own is a slice per live axis: those are
 * `rowSortingFeature`'s, `columnFilteringFeature`'s and `globalFilteringFeature`'s, and under
 * deferral this feature owns the *atoms* beneath them instead, supplied by `createTable` through
 * `options.atoms` (see {@link createDraftAtoms}). That inversion is the whole port: an external
 * atom beats `options.state` by upstream's own precedence rule, so a consumer in controlled mode
 * mirroring back the last applied query can no longer discard what the user is composing. v8
 * defended against that with a hand-written axis filter inside `syncControlledState`; v9 makes it
 * structurally impossible.
 *
 * `draft` goes in through `initTableInstanceData` rather than `constructTableAPIs`: it is a
 * namespace **object**, and `assignTableAPIs` installs one function per key.
 */
export const draftFeature: TableFeature = {
	// `initialState.sorting` (and friends) seed the APPLIED snapshot — a grid given an initial
	// sort must not be born dirty. It no longer seeds the live axes: `createDraftAtoms` does that,
	// from `initialState.draft`, and the two read the same object so they cannot disagree.
	//
	// `draft` is stripped from what is returned. It is a seed-only key, and leaving it in would
	// make `constructTable` mint a `draft` base atom, a `draft` entry in `table.atoms` and a
	// `draft` member of every `table.store` snapshot — a state slice nothing reads or writes.
	getInitialState: (initialState) => {
		const seed = initialState as DraftSeed | undefined
		const { draft: _seedOnly, ...rest } = seed ?? {}
		return {
			...rest,
			applied: appliedSeed(seed),
		}
	},

	initTableInstanceData: (table) => {
		// Not a hand-written cast: `assignTableInstanceData` checks the member name against the
		// `Table_FeatureMap` entry above, so a misspelled one cannot install silently.
		assignTableInstanceData('draftFeature', table, {
			draft: createDraftApi(table as unknown as DraftTable),
		})
	},

	// **The one feature whose reset hook restores state**, and the inversion is upstream's, not
	// ours: `table_reset` writes `baseAtoms[key].set(…)` for every key of `table.initialState`
	// and nothing else, while `table.atoms[key]` resolves `options.atoms[key]` **instead of** the
	// base atom when one is supplied (`constructTable.js:88-99`). So a reset moves an atom the
	// table no longer reads, and the three deferred axes come through it untouched — the user's
	// pending draft surviving a `table.reset()`. Every other feature's hook may assume the reset
	// pass already ran; this one has to do the pass itself, for its own axes.
	//
	// Restored to `initialState.applied` rather than to the `initialState.draft` the atoms were
	// born with: `applied` is what the reset pass just put back, so this leaves the two in step
	// and the table clean. A reset that handed back a pending draft would be a "reset" that
	// leaves the grid dirty.
	//
	// Guarded on deferral because without it there are no external atoms: the reset pass already
	// restored these three through their base atoms, and writing them again would be a second
	// store notification outside its batch.
	resetTableInstanceData: (table) => {
		const draftTable = table as unknown as DraftTable
		if (!isDeferred(draftTable)) return
		const applied = draftTable.initialState.applied ?? DEFAULT_APPLIED_STATE
		draftTable._reactivity.batch(() => {
			for (const axis of DRAFT_AXES) writeAxis(draftTable, axis, applied[axis])
		})
	},
}
