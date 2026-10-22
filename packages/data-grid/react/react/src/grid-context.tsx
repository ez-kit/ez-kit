'use client'

import { useSelector } from '@tanstack/react-store'
import { useMemo } from 'react'

import { useDataGridTable } from './data-grid/table-context'

import type { DataGridSelectorOptions } from './use-data-grid-selector'
import type { TableReactivityBindings } from '@tanstack/table-core/reactivity'

/**
 * The context a grid carries when nothing has given it a type: a string-keyed record of unknown
 * values. This is what the kits' prebuilt `DataGrid`, a bare `useDataGrid`, a
 * `DataGridOptionsProvider` and the package-level {@link useGridContext} see.
 *
 * ## Where a type comes from
 *
 * There is no program-wide declaration to extend. A context gets its type from a **value**:
 *
 * - `createDataGrid({ context })` — the factory default. Its type becomes the bundle's context
 *   type, the bundle's own `useGridContext` reads it with every key present, and the bundle's
 *   `DataGrid` / `useDataGrid` take a `Partial` of it. This is the main path.
 * - `useGridContext.withTypes<T>()` — for a grid with no factory of its own. An unchecked
 *   assertion: nothing compares `T` with what the grid actually carries.
 *
 * So two bundles in one program can carry different contexts, and neither affects untyped grids.
 *
 * ## How a value gets here
 *
 * `context` is an option like any other, so it arrives through the same three layers —
 * `createDataGrid({ context })` < `DataGridOptionsProvider` < the instance's own config, instance
 * wins — through the same `deepMerge`: nested plain objects merge key by key, while anything else
 * (an array, a class instance, a store, a primitive) is replaced whole.
 */
export type GridContextRecord = Record<string, unknown>

/**
 * A context reader: the whole object without an argument, one slice with a selector. Both
 * {@link useGridContext} and the reader a `createDataGrid({ context })` bundle hands back have
 * this shape, differing only in `TContext`.
 */
export type GridContextReader<TContext> = {
	(): TContext
	<TSelected>(selector: (context: TContext) => TSelected, options?: DataGridSelectorOptions<TSelected>): TSelected
}

/** The value every grid starts from, and the one a grid that never sets `context` keeps. */
export const EMPTY_GRID_CONTEXT: GridContextRecord = {}

/** Cancels a subscription made with {@link GridContextAtom.subscribe}. */
type Unsubscribe = () => void

/**
 * The live `context` value plus the subscription that makes reading it reactive.
 *
 * Deliberately **not** a member of `ResolvedGridOptions`. That object is read from a ref and
 * never subscribes — correct for settings settled once per render, wrong for a value whose
 * whole point is that components re-render when it changes. Holding it in both places would
 * put one copy where nothing wakes it, which is the failure `ResolvedGridOptions` replaced.
 *
 * Deliberately not `Atom<GridContextRecord>` itself, for two reasons. First, naming `@tanstack/store`'s
 * `Atom` in an exported type would write an `import('@tanstack/store')` into this package's
 * `.d.ts` for a package it does not depend on directly — the same `TS2742` `DraftAtoms` avoids in
 * `@ez-kit/data-grid-core` (see that type's docblock). Second, the two bindings below need
 * different underlying primitives (a plain readonly atom under the render-phase binding, a
 * genuinely writable one under the vanilla one — see {@link createGridContextAtom}), and this is
 * the one shape both can satisfy.
 */
export type GridContextAtom = {
	get: () => GridContextRecord
	subscribe: (onChange: (value: GridContextRecord) => void) => Unsubscribe
	/**
	 * Replaces the value. Safe to call during render: under a binding with a `commit` hook
	 * (`useTable`'s render-phase reactivity) the write lands invisibly and subscribers wake at
	 * the table's own next commit, already called unconditionally from `useTable`'s layout effect
	 * for the whole table — nothing here schedules a second one. Under a binding with no `commit`
	 * (the vanilla one `prepareDataGridTable` sees) it notifies synchronously, which is correct
	 * there: that path has no render to protect and no commit step to wait for.
	 */
	write: (next: GridContextRecord) => void
}

/**
 * Builds the per-grid context atom, from the **same reactivity binding the table itself uses**
 * (`table._reactivity`) — so this is one store instance per table, not a second one:
 * `@tanstack/table-core/reactivity` is a subpath of a package this one already depends on.
 * `@tanstack/react-store` is used only to **read** the atom, through {@link useGridContext}; the
 * atom itself is the binding's own.
 *
 * The two bindings need genuinely different treatment, verified against the actual
 * `@tanstack/table-core@9.2.4` implementations rather than assumed from their docs:
 *
 * - **Render-phase** (`reactivity.commit` present — `useDataGrid` running on `useTable`):
 *   `createWritableAtom(initial).set(next)` still notifies synchronously, because a subscriber
 *   reading another *reactive atom* (`.get()` on one) is a real tracked dependency and the
 *   render-phase binding's `commit` gate only defers atoms whose resolver reads a **plain**,
 *   non-reactive value — exactly `options.state` in `constructTable`'s own controlled-slice
 *   atoms. So the write here targets a plain closure variable, read by
 *   `reactivity.createReadonlyAtom(() => value)`: `.get()` always re-evaluates and returns the
 *   fresh value immediately (safe to read the same render that wrote it), while `.subscribe()`
 *   only fires after the table's own `commit()` — called unconditionally, every render, from
 *   `useTable`'s layout effect via `table_publishExternalState`, whether or not the grid uses
 *   controlled state. No second layout effect is needed here to get that timing.
 * - **Vanilla** (`reactivity.commit` absent — `prepareDataGridTable`'s bare `constructTable`
 *   table): the plain-closure-variable trick above does not apply — that binding's
 *   `createReadonlyAtom` has no dependency to invalidate on and never re-evaluates after its
 *   first read, so a written-but-unread closure variable would look permanently stale. A real
 *   `createWritableAtom` is used instead, whose synchronous notify is correct there: this path
 *   is a headless table or one driven by hand, with no render to protect.
 *
 * Called once per table, by `prepareDataGridTable` and by `useDataGrid`.
 */
export function createGridContextAtom(
	reactivity: TableReactivityBindings,
	initial: GridContextRecord = EMPTY_GRID_CONTEXT,
): GridContextAtom {
	const toUnsubscribe =
		(subscription: { unsubscribe: () => void }): Unsubscribe =>
		() => {
			subscription.unsubscribe()
		}

	if (reactivity.commit) {
		let value = initial
		const atom = reactivity.createReadonlyAtom(() => value, { debugName: 'gridContext' })
		return {
			get: atom.get,
			subscribe: (onChange) => toUnsubscribe(atom.subscribe(onChange)),
			write: (next) => {
				value = next
			},
		}
	}

	const atom = reactivity.createWritableAtom(initial, { debugName: 'gridContext' })
	return {
		get: atom.get,
		subscribe: (onChange) => toUnsubscribe(atom.subscribe(onChange)),
		write: (next) => {
			atom.set(next)
		},
	}
}

// `gridContext` used to be declared onto TanStack's `Table` from here, through a
// `declare module '@tanstack/table-core'` block. In v9 `Table` is a **type alias**, not an
// interface, so that block never merged: it declared a second, one-parameter `Table` inside the
// module's scope and every `Table<TFeatures, TData>` in this package resolved against that
// shadow instead of against v9's real type. It now lives on this package's own `DataTable` alias
// (`./types`), where it is an ordinary member typed as `GridContextAtom` — this file only
// declares the property's type; `createGridContextAtom` above is where the value comes from.

/**
 * Whether two context values agree, compared one level deep.
 *
 * Shallow on purpose. `deepMerge` hands back the caller's own object untouched when a single
 * option layer supplies `context`, so identity alone answers the common case; when two layers
 * both write it, the merge rebuilds the top level every render and only a key-by-key check can
 * tell a real change from a re-merge. Going deeper would mean walking arbitrary application
 * data — arrays, class instances, closures — on every render of every grid, to decide something
 * the selector form of {@link useGridContext} already decides for free.
 */
function isSameContext(a: GridContextRecord, b: GridContextRecord): boolean {
	if (a === b) return true
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every((key) => a[key] === b[key])
}

/**
 * Pushes the merged `context` into the atom, during render, only when it actually changed.
 *
 * Still guarded by {@link isSameContext} with the atom in place: `mergeGridOptionLayers` rebuilds
 * the merged config every render, so an unconditional write would hand the render-phase atom's
 * `get()` a fresh-but-equal object every time — defeating its own `Object.is` snapshot compare
 * (see {@link createGridContextAtom}) and waking every whole-object reader on every render of the
 * grid, exactly the failure this guard always existed to prevent.
 */
export function syncGridContext(atom: GridContextAtom, next: GridContextRecord): void {
	if (isSameContext(atom.get(), next)) return
	atom.write(next)
}

/**
 * The shape `useSelector` reads — `get()` plus a `subscribe()` that hands back an object with
 * `unsubscribe`. {@link GridContextAtom}'s `subscribe` returns the teardown function itself, which
 * is the shape this package exports, so it is adapted here rather than changed there.
 */
type GridContextSource = {
	get: () => GridContextRecord
	subscribe: (listener: (value: GridContextRecord) => void) => { unsubscribe: Unsubscribe }
}

function toSelectionSource(atom: GridContextAtom): GridContextSource {
	return {
		get: atom.get,
		subscribe: (listener) => ({ unsubscribe: atom.subscribe(listener) }),
	}
}

const selectWhole = (context: GridContextRecord): GridContextRecord => context

function useGridContextImpl(): GridContextRecord
function useGridContextImpl<TSelected>(
	selector: (context: GridContextRecord) => TSelected,
	options?: DataGridSelectorOptions<TSelected>,
): TSelected
function useGridContextImpl<TSelected>(
	selector?: (context: GridContextRecord) => TSelected,
	options?: DataGridSelectorOptions<TSelected>,
): GridContextRecord | TSelected {
	const atom = useDataGridTable().gridContext
	// One adapter per atom, so `useSelector`'s subscription — keyed on the source's identity —
	// is made once for the grid's life rather than on every render.
	const source = useMemo(() => toSelectionSource(atom), [atom])
	// The one cast: `compare` takes `TSelected`, and `strictFunctionTypes` will not widen a function
	// parameter to the `GridContextRecord | TSelected` the two forms share. Sound because the
	// overloads only accept `options` beside a selector, so `compare` never sees the whole context.
	return useSelector<GridContextRecord, GridContextRecord | TSelected>(
		source,
		selector ?? selectWhole,
		options as DataGridSelectorOptions<GridContextRecord | TSelected> | undefined,
	)
}

/**
 * The same reader, typed for `T`. The one place the context's type is asserted rather than
 * inferred, and it is not checked: a grid carrying a different context still compiles. Reach for
 * it only for a grid with no factory of its own — `createDataGrid({ context })` types the bundle's
 * reader from a value instead. Same shape as Redux's `useSelector.withTypes`.
 */
function withTypes<T extends object>(): GridContextReader<T> {
	return useGridContextImpl as GridContextReader<T>
}

/**
 * Reads the grid's context — the application and kit values carried alongside it — typed as a
 * {@link GridContextRecord}. A bundle built with `createDataGrid({ context })` hands back its own
 * `useGridContext`, typed from that default; `useGridContext.withTypes<T>()` types this one for a
 * grid without a factory.
 *
 * Two forms. Without an argument it returns the whole object and re-renders whenever any part of
 * it changes. With a selector it returns one slice and re-renders only when **that** slice
 * changes, which is what makes the hook usable from a cell renderer.
 *
 * **Selector contract**, identical to `useDataGridState`: the slice is compared with
 * `options.compare`, strict equality unless one is passed. Field access (`(c) => c.permissions`)
 * and primitive computations (`(c) => c.permissions.canEdit`) need nothing more. A selector that
 * builds a fresh object (`(c) => ({ ...c.permissions })`) renders fine, but re-renders on every
 * context change unless it is given `compare: shallow`.
 *
 * Throws outside `<DataGrid>`, like every other context-bound hook in this package.
 *
 * Assembled with one annotated `Object.assign` over a flat literal rather than a top-level
 * `useGridContext.withTypes = …`: an assignment is a statement esbuild cannot drop, and it would
 * anchor this hook into every partial import of the package — the defect the compound
 * `DataGrid` namespace once had. Never spread into the literal either; see AGENTS.md.
 *
 * @example A typed reader, once per module
 *   const useAppGridContext = useGridContext.withTypes<{ permissions: { canEdit: boolean; canDelete: boolean } }>()
 *
 * @example Whole object
 *   const { permissions } = useAppGridContext()
 *
 * @example One slice — this cell re-renders when the permission flips, and not before
 *   const canEdit = useAppGridContext((c) => c.permissions.canEdit)
 *
 * @example A derived object
 *   const { canEdit, canDelete } = useAppGridContext((c) => ({ ...c.permissions }), { compare: shallow })
 */
export const useGridContext: GridContextReader<GridContextRecord> & {
	withTypes: typeof withTypes
} = /* @__PURE__ */ Object.assign(useGridContextImpl, { withTypes })
