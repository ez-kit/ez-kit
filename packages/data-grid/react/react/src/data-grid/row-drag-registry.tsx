'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

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
	#renderedRowIds: readonly string[] | null = null
	#activeRowId: string | null = null
	readonly #activeListeners = new Set<() => void>()
	readonly #warnedRowIds = new Set<string>()

	/**
	 * Whether `row.id`'s unpublished-row defect is still unreported here — true once, false after.
	 *
	 * On the registry rather than in a module-level `Set` so the record is **per grid**. `getRowId`
	 * usually returns the record's own id, so two grids over the same records use the same row ids,
	 * and a module-level set let grid A's warning for row `"1"` permanently suppress grid B's — hiding
	 * a real defect in the second grid. It also survived Fast Refresh, so the warning would not
	 * re-fire after a fix without a full reload. Dev-only either way; see `row.tsx` for the condition.
	 */
	shouldReportUnpublishedRow(rowId: string): boolean {
		if (this.#warnedRowIds.has(rowId)) return false
		this.#warnedRowIds.add(rowId)

		return true
	}

	/**
	 * The rows a body has declared it is rendering, in DOM order — or `null` for "derive it".
	 *
	 * Only a **virtualized** body publishes. A built-in non-virtual body renders exactly
	 * `getRowDropOrder(table)`, so publishing it would be copying a value in order to compare it
	 * with itself, at one array allocation per render for every grid; and a hand-written body cannot
	 * publish, because the rows it renders are the consumer's choice. Both therefore fall back to
	 * the derivation, so the common case pays nothing for a list it could derive.
	 */
	getRenderedRowIds(): readonly string[] | null {
		return this.#renderedRowIds
	}

	setRenderedRowIds(ids: readonly string[] | null): void {
		this.#renderedRowIds = ids
	}

	/** The row being dragged right now, whether or not it is still inside the virtual window. */
	getActiveRowId(): string | null {
		return this.#activeRowId
	}

	setActiveRowId(rowId: string | null): void {
		if (this.#activeRowId === rowId) return
		this.#activeRowId = rowId
		for (const listener of this.#activeListeners) listener()
	}

	subscribeActiveRow(listener: () => void): () => void {
		this.#activeListeners.add(listener)

		return () => {
			this.#activeListeners.delete(listener)
		}
	}

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
 * Declare the rows this body renders, in DOM order. Called by `VirtualBody`; `null` from `Body`.
 *
 * Written **during render** for the same reason `useRegisterRowDrag` is: the readers are the body's
 * own children, so React has already run this by the time any of them computes an index. No
 * notification, and none needed — nothing subscribes, and a body that re-renders re-publishes.
 *
 * The array is deliberately **not** memoised. The only consumers read it positionally and hand a
 * *number* to the sortable, so a fresh array of the same ids changes nothing downstream; memoising
 * on a joined key would cost a string the length of the window on every scroll frame to protect
 * against a re-registration that does not happen.
 */
export function usePublishRenderedRows(ids: readonly string[] | null): void {
	useContext(RowDragRegistryContext)?.setRenderedRowIds(ids)
}

/** The published rendered-row list, or `null` when the body derives it. Read during render. */
export function useRenderedRowIds(): readonly string[] | null {
	return useContext(RowDragRegistryContext)?.getRenderedRowIds() ?? null
}

/**
 * Report this grid's unpublished-row defect at most once per row id — see
 * {@link RowDragRegistry.shouldReportUnpublishedRow}. Called during render, by `row.tsx`, in
 * development only; `false` with no registry above, which is a state the condition cannot reach.
 */
export function useShouldReportUnpublishedRow(): (rowId: string) => boolean {
	const registry = useContext(RowDragRegistryContext)

	return useCallback((rowId: string) => registry?.shouldReportUnpublishedRow(rowId) ?? false, [registry])
}

/**
 * The row currently being dragged, subscribed — so a virtualized body re-renders when one starts.
 *
 * This is what lets the body keep the dragged row mounted after the window has scrolled past it.
 * Without it the row unmounts mid-gesture, its sortable unregisters, and the index space it left
 * behind has a hole: the drag keeps *looking* alive, because the visible element from then on is
 * dnd-kit's own clone rather than React's row, and the drop resolves the source to `-1`. Measured;
 * `dnd-phase-9-virtualized-drag.plan.md` records the probe.
 */
export function useActiveDraggingRow(): string | null {
	const registry = useContext(RowDragRegistryContext)
	// Stable, so `useSyncExternalStore` does not tear the subscription down and set it up again on
	// every render — which, for the one subscriber that re-renders per auto-scroll frame, is a
	// per-frame cost. `useRowDrag` below has the same shape; it is not on this path.
	const subscribe = useCallback(
		(listener: () => void) => (registry ? registry.subscribeActiveRow(listener) : () => {}),
		[registry],
	)

	return useSyncExternalStore(
		subscribe,
		() => registry?.getActiveRowId() ?? null,
		() => null,
	)
}

/**
 * Record this row as the active drag while it is dragging. Called by `<DataGrid.Row>`.
 *
 * **Cancellation needs no separate path, which is the one elegant part of holding a row.** A
 * cancelled drag fires no `onDrop`, so clearing the record on commit would leak it — but the row is
 * still mounted precisely *because* it is recorded, so its own `isDragging` going false clears it
 * either way. That is why the port grew no `onDragEnd`.
 *
 * `isDragging` must come from the derived `drag` value rather than the raw sortable, or a row the
 * grid refused to make draggable could pin itself active forever.
 */
export function useReportActiveDraggingRow(rowId: string, isDragging: boolean): void {
	const registry = useContext(RowDragRegistryContext)

	useEffect(() => {
		if (!registry) return undefined
		if (!isDragging) {
			// Another row may have become active in the meantime; only ever clear our own record.
			if (registry.getActiveRowId() === rowId) registry.setActiveRowId(null)
			return undefined
		}
		registry.setActiveRowId(rowId)

		return () => {
			if (registry.getActiveRowId() === rowId) registry.setActiveRowId(null)
		}
	}, [registry, rowId, isDragging])
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
