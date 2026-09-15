'use client'

import { useSyncExternalStore } from 'react'

import { useDataGridTable } from './data-grid/table-context'

import type { RowData } from '@tanstack/table-core'

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

/** Cancels a subscription made with {@link GridContextStore.subscribe}. */
type Unsubscribe = () => void

/**
 * The live `context` value plus the subscription that makes reading it reactive.
 *
 * Deliberately **not** a member of `ResolvedGridOptions`. That object is read from a ref and
 * never subscribes — correct for settings settled once per render, wrong for a value whose
 * whole point is that components re-render when it changes. Holding it in both places would
 * put one copy where nothing wakes it, which is the failure `ResolvedGridOptions` replaced.
 *
 * A local store rather than `@ez-kit/data-grid-core`'s: that one is internal to core, and this
 * needs twenty lines, not a new name in core's public API.
 */
export type GridContextStore = {
	getState: () => GridContext
	/**
	 * Replaces the value. Pass `{ silent: true }` for a write made during a render pass — the
	 * new value is readable immediately, but subscribers are woken later, by {@link notify},
	 * rather than mid-render.
	 */
	setState: (next: GridContext, options?: { silent?: boolean }) => void
	/** Wakes every subscriber with the current value. Pairs with a `silent` write. */
	notify: () => void
	subscribe: (listener: () => void) => Unsubscribe
}

/** Builds the per-grid context store. Called once per table by `prepareDataGridTable`. */
export function createGridContextStore(initial: GridContext = EMPTY_GRID_CONTEXT): GridContextStore {
	let state = initial
	const listeners = new Set<() => void>()

	const notify = (): void => {
		listeners.forEach((listener) => {
			listener()
		})
	}

	return {
		getState: () => state,
		setState: (next, options) => {
			state = next
			if (!options?.silent) notify()
		},
		notify,
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}

declare module '@tanstack/table-core' {
	// The row type is erased here, exactly as it is on `grid`: the context is a fact about the
	// grid's surroundings, never a row-bound value.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		/**
		 * The grid's {@link GridContext}, behind a subscription. Seeded by `prepareDataGridTable`
		 * so it is **always** a store — no reader guards the property — and written by
		 * `useDataGrid` whenever the merged `context` option changes. Read it with
		 * {@link useGridContext}.
		 */
		gridContext: GridContextStore
	}
}

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
 * Pushes the merged `context` into the store, and reports whether subscribers still need waking.
 *
 * The write happens during render so the very pass that resolves a new context reads it, and is
 * therefore `silent`: notifying here would run a subscribed child's `useSyncExternalStore`
 * callback while the grid is still rendering. The caller flushes with `store.notify()` from a
 * layout effect — the same two-step `useDataGrid` already uses for controlled state.
 *
 * @returns `true` when a write landed and a notify is owed.
 */
export function syncGridContext(store: GridContextStore, next: GridContext): boolean {
	if (isSameContext(store.getState(), next)) return false
	store.setState(next, { silent: true })
	return true
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
	const store = useDataGridTable().gridContext
	const read = (): GridContext | TSelected => (selector ? selector(store.getState()) : store.getState())
	return useSyncExternalStore(store.subscribe, read, read)
}
