'use client'

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

import type { SortableItemHandle } from './dnd'
import type { ReactNode } from 'react'

/** The drag half of one row: its activator ref, and whether it is the row being dragged. */
export type RowDragValue = Pick<SortableItemHandle, 'handleRef' | 'isDragging'>

/**
 * A **table-level** registry of row drag state, keyed by row id.
 *
 * The obvious design — a context mounted by `<DataGrid.Row>` and read by a handle inside it — does
 * not work, and the reason is a property of the HeroUI kit rather than a bug: there, cells are
 * rendered by React Aria's collection, **outside** the React subtree the row component owns. Every
 * row-level context is therefore unreachable from a cell renderer, which is where a handle
 * ordinarily sits. The pre-existing `useDataGridRow()` has the same hole and simply throws there;
 * it was found by probing this one.
 *
 * What *is* reachable from a cell is anything provided at the table's level — verified the same
 * way — and the cell's own context, which carries `cell.row.id`. So the row publishes here under
 * its id and the handle looks itself up. Both kits reach it, and a consumer still writes
 * `<DataGrid.RowDragHandle />` with no arguments.
 *
 * A store rather than a context value because the reader is not below the writer: a handle cannot
 * re-render from the row's render, so it subscribes to its own row's entry and to nothing else.
 */
class RowDragRegistry {
	readonly #values = new Map<string, RowDragValue>()
	readonly #listeners = new Map<string, Set<() => void>>()

	get(rowId: string): RowDragValue | null {
		return this.#values.get(rowId) ?? null
	}

	/** Called by the row. Returns true when the value actually changed and listeners need waking. */
	write(rowId: string, value: RowDragValue | null): boolean {
		const previous = this.#values.get(rowId)
		if (value === null) {
			if (previous === undefined) return false
			this.#values.delete(rowId)
			return true
		}
		if (previous?.handleRef === value.handleRef && previous.isDragging === value.isDragging) return false
		this.#values.set(rowId, value)
		return true
	}

	notify(rowId: string): void {
		for (const listener of this.#listeners.get(rowId) ?? []) listener()
	}

	subscribe(rowId: string, listener: () => void): () => void {
		const listeners = this.#listeners.get(rowId) ?? new Set()
		listeners.add(listener)
		this.#listeners.set(rowId, listeners)

		return () => {
			listeners.delete(listener)
			if (listeners.size === 0) this.#listeners.delete(rowId)
		}
	}
}

const RowDragRegistryContext = createContext<RowDragRegistry | null>(null)

/** One registry per grid, mounted by the shared core above everything that renders a row. */
export function RowDragRegistryProvider({ children }: { children: ReactNode }) {
	const registryRef = useRef<RowDragRegistry | null>(null)
	registryRef.current ??= new RowDragRegistry()

	return <RowDragRegistryContext.Provider value={registryRef.current}>{children}</RowDragRegistryContext.Provider>
}

/**
 * Publish one row's drag state. Called by `<DataGrid.Row>`, once per row.
 *
 * The write happens **during render** and the wake-up in a layout effect. That split is what keeps
 * a handle correct on its first paint: it may render before or after its row — in the HeroUI kit
 * the collection decides, not the element tree — so the value has to be there for whoever reads
 * first, while the notification has to wait until React is done committing.
 */
export function useRegisterRowDrag(rowId: string, value: RowDragValue | null): void {
	const registry = useContext(RowDragRegistryContext)
	const changed = registry?.write(rowId, value) ?? false

	useEffect(() => {
		if (changed) registry?.notify(rowId)
	})
}

/**
 * The drag state of a row — `null` when it cannot be dragged, or when there is no registry above.
 *
 * `rowId` is optional: omitted, it is taken from the cell this is rendered in, which is how
 * `<DataGrid.RowDragHandle />` needs no arguments inside a column's `cell.component`. Name it
 * explicitly anywhere else.
 */
export function useRowDrag(rowId: string | undefined): RowDragValue | null {
	const registry = useContext(RowDragRegistryContext)

	return useSyncExternalStore(
		(listener) => (registry && rowId !== undefined ? registry.subscribe(rowId, listener) : () => {}),
		() => (registry && rowId !== undefined ? registry.get(rowId) : null),
		() => null,
	)
}
