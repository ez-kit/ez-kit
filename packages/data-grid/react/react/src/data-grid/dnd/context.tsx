'use client'

import { createContext, useContext, useRef } from 'react'

import { noopDndAdapter } from './noop'

import type { DndAdapter, DragSpec, SortableItemHandle } from './types'
import type { ReactNode } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * The **bundle** layer: the adapter `createDataGrid({ dnd })` was built with.
 *
 * Deliberately not the same context as {@link DndGridContext}, for the reason
 * `GridFactoryDefaultsContext` is not the same context as `DataGridOptionsContext`
 * (`data-grid-options-context.tsx`): one value cannot be both carried down past a grid root and
 * reset at it, and both are needed here. The bound `<DataGrid>` publishes this one; the shared
 * core reads it, republishes it as the grid layer, and closes this one off.
 *
 * `null` means "this bundle brought no adapter", which is what every existing bundle is.
 */
const DndBundleContext = createContext<DndAdapter | null>(null)

/**
 * The **grid** layer: the adapter *this* grid runs on, published by the shared core.
 *
 * Every root publishes a value here, including `null`. That is the point: without it, a grid
 * nested among a DnD-bound grid's children — an expanded detail row, a grid inside a cell — would
 * read the outer grid's adapter, because every context in this package is created at module scope
 * and is therefore shared by everything resolving the same copy of the package.
 */
const DndGridContext = createContext<DndAdapter | null>(null)

/** Publishes the bundle's adapter to the bound `<DataGrid>`'s subtree. Not exported publicly. */
export function DndBundleProvider({ adapter, children }: { adapter: DndAdapter | null; children: ReactNode }) {
	return <DndBundleContext.Provider value={adapter}>{children}</DndBundleContext.Provider>
}

/** Reads the bundle layer. Called by the shared core, once, to promote it to the grid layer. */
export function useDndBundleAdapter(): DndAdapter | null {
	return useContext(DndBundleContext)
}

/**
 * Publishes the adapter one grid runs on.
 *
 * Mounted by every grid root. An application may mount it itself — but **only below a root**, for
 * instance around the `children` it hands `<DataGrid>`. Wrapping `<DataGrid>` from the outside has
 * no effect and fails silently: the root publishes its own value here, overwriting whatever it was
 * given, which is precisely what stops a nested grid inheriting an outer adapter.
 */
export function DndAdapterProvider({ adapter, children }: { adapter: DndAdapter | null; children: ReactNode }) {
	/*
	 * `useSortableItem` below calls `adapter.useSortableItem` — a hook — unconditionally, so
	 * swapping the adapter under a mounted tree swaps one hook implementation for another between
	 * renders. React's own error for that is about hook order and names nothing useful, so say what
	 * actually happened. The sanctioned binding is build-time (`createDataGrid`), which is why this
	 * is a development warning rather than an invariant with machinery behind it.
	 */
	const seenRef = useRef(adapter)
	if (IS_DEV && seenRef.current !== adapter) {
		console.error(
			'<DataGrid> was given a different drag-and-drop adapter than the one it mounted with. ' +
				'The adapter is bound once, at `createDataGrid` time, and must not change under a mounted tree — ' +
				'it supplies a hook, so replacing it changes the hooks every row and header cell call.',
		)
	}
	seenRef.current = adapter

	return <DndGridContext.Provider value={adapter}>{children}</DndGridContext.Provider>
}

/** The adapter this grid runs on, or `null` when it has none. */
export function useDndAdapter(): DndAdapter | null {
	return useContext(DndGridContext)
}

/**
 * Whether this grid has a drag adapter at all — **the condition a drag handle renders behind**.
 *
 * A handle must not render when no adapter is registered: with no mechanics behind it, it is an
 * affordance that promises something the grid cannot do. This is that check, and it is not
 * `isDragging`, which only says whether a drag is in flight right now.
 */
export function useDndEnabled(): boolean {
	return useDndAdapter() !== null
}

/**
 * Register one draggable item.
 *
 * Delegates to the grid's adapter, or to the no-op when there is none — an **unconditional** call
 * either way, because this is a hook. That is exactly why the adapter is bound once at
 * `createDataGrid` time and must not change under a mounted tree; {@link DndAdapterProvider} warns
 * in development if it does.
 */
export function useSortableItem(spec: DragSpec): SortableItemHandle {
	const adapter = useDndAdapter()
	return (adapter ?? noopDndAdapter).useSortableItem(spec)
}
