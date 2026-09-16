'use client'

import { useSyncExternalStore } from 'react'

import { useDataGridTable } from './data-grid/table-context'

import type { TableReactivityBindings } from '@tanstack/table-core/reactivity'

/**
 * Application- and kit-supplied values carried alongside a grid, for components that need to
 * agree with their surroundings rather than receive everything as a prop.
 *
 * **Empty by design.** The package declares no members; a consumer adds them by declaration
 * merging, exactly as TanStack's `TableMeta` is extended:
 *
 * ```ts
 * declare module '@ez-kit/data-grid-react' {
 *   interface GridContext {
 *     currentUser: { id: string; role: 'admin' | 'viewer' }
 *     permissions: { canEdit: boolean }
 *   }
 * }
 * ```
 *
 * Until something extends it, the `context` option accepts `{}`, {@link useGridContext} returns
 * `{}`, and nothing about a grid changes.
 *
 * ## Who owns which key
 *
 * The interface is one flat namespace shared by the application and whichever UI kit it renders
 * through, and nothing in the types keeps the two apart. The convention is that **a kit writes
 * only under its own key** — `context.shadcn`, `context.heroui` — and leaves the rest to the
 * application, so a kit shipping a new setting cannot collide with a name an app already uses.
 *
 * ## How a value gets here
 *
 * `context` is an option like any other, so it arrives through the same three layers and merges
 * the same way — `createDataGrid({ defaults })` < `DataGridOptionsProvider` < the instance's own
 * config, deep-merged, instance wins. That is what lets a kit state its own settings once at the
 * factory while an application refines a single key at one call site.
 *
 * Merging **replaces** a named key rather than accumulating it, like every option except
 * `layout.classNames`: writing `permissions` at the call site means those permissions, not a
 * union with the ones a provider declared.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions
export interface GridContext {}

/** The value every grid starts from, and the one a grid that never sets `context` keeps. */
export const EMPTY_GRID_CONTEXT: GridContext = {}

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
 * Deliberately not `Atom<GridContext>` itself, for two reasons. First, naming `@tanstack/store`'s
 * `Atom` in an exported type would write an `import('@tanstack/store')` into this package's
 * `.d.ts` for a package it does not depend on directly — the same `TS2742` `DraftAtoms` avoids in
 * `@ez-kit/data-grid-core` (see that type's docblock). Second, the two bindings below need
 * different underlying primitives (a plain readonly atom under the render-phase binding, a
 * genuinely writable one under the vanilla one — see {@link createGridContextAtom}), and this is
 * the one shape both can satisfy.
 */
export type GridContextAtom = {
	get: () => GridContext
	subscribe: (onChange: (value: GridContext) => void) => Unsubscribe
	/**
	 * Replaces the value. Safe to call during render: under a binding with a `commit` hook
	 * (`useTable`'s render-phase reactivity) the write lands invisibly and subscribers wake at
	 * the table's own next commit, already called unconditionally from `useTable`'s layout effect
	 * for the whole table — nothing here schedules a second one. Under a binding with no `commit`
	 * (the vanilla one `prepareDataGridTable` sees) it notifies synchronously, which is correct
	 * there: that path has no render to protect and no commit step to wait for.
	 */
	write: (next: GridContext) => void
}

/**
 * Builds the per-grid context atom, from the **same reactivity binding the table itself uses**
 * (`table._reactivity`) — so this is one store instance per table, not a second one, and no new
 * dependency: `@tanstack/table-core/reactivity` is a subpath of a package this one already
 * depends on, and neither binding requires naming `@tanstack/react-store` here (Task 17 Step 1
 * records why that dependency is not taken directly).
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
	initial: GridContext = EMPTY_GRID_CONTEXT,
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
function isSameContext(a: GridContext, b: GridContext): boolean {
	if (a === b) return true
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every((key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key])
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
export function syncGridContext(atom: GridContextAtom, next: GridContext): void {
	if (isSameContext(atom.get(), next)) return
	atom.write(next)
}

export function useGridContext(): GridContext
export function useGridContext<TSelected>(selector: (context: GridContext) => TSelected): TSelected
/**
 * Reads the grid's {@link GridContext} — the application and kit values carried alongside it.
 *
 * Two forms. Without an argument it returns the whole object and re-renders whenever any part of
 * it changes. With a selector it returns one slice and re-renders only when **that** slice
 * changes, which is what makes the hook usable from a cell renderer.
 *
 * **Selector contract**, identical to `useDataGridState`: the selector must return a
 * referentially stable value while the context has not changed. Field access
 * (`(c) => c.permissions`) and primitive computations (`(c) => c.permissions.canEdit`) satisfy
 * it; returning a fresh object or array on every call (`(c) => ({ ...c.permissions })`) does
 * not, and will re-render without end — derive such values with `useMemo` around this hook.
 *
 * Throws outside `<DataGrid>`, like every other context-bound hook in this package.
 *
 * @example Whole object
 *   const { currentUser } = useGridContext()
 *
 * @example One slice — this cell re-renders when the permission flips, and not before
 *   const canEdit = useGridContext((c) => c.permissions.canEdit)
 */
export function useGridContext<TSelected>(selector?: (context: GridContext) => TSelected): GridContext | TSelected {
	const atom = useDataGridTable().gridContext
	const read = (): GridContext | TSelected => (selector ? selector(atom.get()) : atom.get())
	return useSyncExternalStore(atom.subscribe, read, read)
}
