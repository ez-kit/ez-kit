/**
 * The drag-and-drop **port**: what a UI kit's adapter implements, and the only vocabulary this
 * package uses to talk about dragging.
 *
 * This package ships no implementation and names no drag library. The mechanics arrive from a
 * kit subpath (`@ez-kit/data-grid-<kit>/dnd`) with the drag library as an *optional* peer, and
 * reach a grid through `createDataGrid({ dnd: adapter })` — see {@link DndAdapter}.
 *
 * **On the no-styles rule.** A drag library applies its own transforms as inline styles on the
 * elements the refs below land on. That is not a violation of the rule AGENTS.md states for this
 * package: _"the test is authorship, not the attribute"_ — nothing here writes a style or a class,
 * exactly as `column.headerClassName` is passed through without being authored.
 */

import type { ComponentType, ReactNode } from 'react'

/**
 * Which order an item is dragged within.
 *
 * Two values, not three: the **visibility panel is the column axis**, because it reorders
 * columns — the same `columnOrder` slice the header does, differing only in scope
 * (`ColumnMoveScope.All`, so hidden columns are valid neighbours there and not in the header).
 * Do not add a `'panel'` member for it.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `axis: 'row'` is equally valid and needs no import.
 */
export const DragAxis = {
	/** Rows, dragged vertically, writing the `rowOrder` slice. */
	Row: 'row',
	/** Columns, dragged along the inline axis, writing `columnOrder`. */
	Column: 'column',
} as const

export type DragAxis = (typeof DragAxis)[keyof typeof DragAxis]

/** What one draggable item tells the adapter about itself. */
export type DragSpec = {
	/** The row id or column id. The same identifier the core drop helpers take. */
	id: string
	/**
	 * The item's **real** index in its axis' order — never its position in a rendered window.
	 *
	 * Stated here because a virtualized body renders a slice: passing the slice-relative index
	 * would make every drag in a scrolled grid land somewhere else.
	 */
	index: number
	/** Which order this item belongs to. Items of different axes never collide. */
	axis: DragAxis
	/**
	 * Whether this item may be picked up at all.
	 *
	 * Carries every lock the one-step path honours — a system column, `column.ordering === false`,
	 * an applied sort, an applied grouping, or the axis' `ordering` being off. A disabled item is
	 * not draggable, which is what keeps all but the band- and parent-crossing refusals out of the
	 * drop helpers.
	 *
	 * Under `exactOptionalPropertyTypes` this may be **omitted** but not passed as `undefined`, so
	 * a call site builds the spec with the conditional spread this package uses throughout:
	 * `{ id, index, axis, ...(disabled !== undefined ? { disabled } : {}) }`.
	 */
	disabled?: boolean
}

/**
 * What the adapter hands back for one item.
 *
 * Three members, deliberately. `@dnd-kit/react@0.1`'s `useSortable` returns eight
 * (`ref`, `targetRef`, `sourceRef`, `handleRef`, `isDropTarget`, `isDragSource`, `isDragging`,
 * `isDropping`); the port takes the ones the grid consumes, so a pre-1.0 rename upstream costs one
 * adapter file and no call site.
 *
 * `ref` and `handleRef` are separate because the activator is **always the drag handle element**,
 * never the whole row or header cell — which is what structurally keeps a keyboard pickup away
 * from the sort toggle and row selection.
 */
export type SortableItemHandle = {
	/** Lands on the element that moves — the row, the header cell, the panel item. */
	ref: (node: HTMLElement | null) => void
	/** Lands on the handle, the only element that starts a drag. */
	handleRef: (node: HTMLElement | null) => void
	/** True while this item is the one being dragged. */
	isDragging: boolean
}

/**
 * A completed drop, as the adapter reports it.
 *
 * **The landing place is an index, not a target id, and that is a correction.** The first revision
 * of this port carried `targetId`, on the PRD's rule that ids are the source of truth and no
 * position is derived. Measured against the real library, that does not survive contact: a sortable
 * displaces its neighbours optimistically *during* the drag, so by the time the drop is reported
 * the source already occupies the place it is going and the collision resolves **to itself** —
 * `source.id === target.id`, every time. An id-based target is degenerate exactly when it matters.
 *
 * dnd-kit's own `move()` helper says the same thing in code: where the ids do not resolve it falls
 * back to `source.initialIndex` → `source.index`, which is the projected position and the only
 * honest answer once optimistic sorting is on. Turning that sorting off would restore a usable
 * `targetId` and take the visual displacement with it — the thing the whole design is built around.
 *
 * So the adapter reports **where the item landed** and the grid turns that into the target its own
 * commit path wants. Ids remain the currency at the core boundary: `dropRow` still takes two row
 * ids, and the grid resolves the second from this index against its own row model, which is the
 * only place that mapping is knowable.
 */
export type DndDropEvent = {
	axis: DragAxis
	/** The item that was picked up. */
	sourceId: string
	/**
	 * Where it should land: the index it occupies in its axis' order at the end of the drag.
	 *
	 * The index is into the same order `DragSpec.index` counts in — the real one, never a position
	 * within a rendered window.
	 */
	targetIndex: number
}

/**
 * What a grid hands its adapter's provider.
 *
 * @remarks Not yet in use. The grid root does not mount {@link DndAdapter.Provider} and nothing
 * calls {@link DndProviderProps.onDrop} until the commit phase lands — so an adapter written
 * against this release will have its hook called and its provider ignored. The contract is
 * published now so a kit's adapter can be written and typed against it, not because the grid
 * drives it yet.
 */
export type DndProviderProps = {
	/**
	 * Called once per completed drop, never during one. A refused drop — across a pin band, across
	 * a parent, onto a locked item — still arrives here and is rejected by the core drop helpers,
	 * which is where boundaries are enforced.
	 */
	onDrop: (event: DndDropEvent) => void
	children: ReactNode
}

/**
 * The whole contract a kit's `/dnd` module exports as `adapter`.
 *
 * Hooks rather than components, decided: one `useSortableItem` serves every surface through
 * `axis`, where a component-shaped port would need a member per surface — the lesson
 * `FullGridComponents` already taught this package, where every new key is a major. The cost is
 * that {@link DndAdapter.useSortableItem} is a hook called unconditionally, so **the adapter is
 * bound once, at `createDataGrid` time, and must not change under a mounted tree**; a
 * development-mode warning says so if it does.
 */
export type DndAdapter = {
	/**
	 * Mounts the drag context for one grid. Receives the grid's commit callback.
	 *
	 * @remarks Declared, not yet mounted — see {@link DndProviderProps}.
	 */
	Provider: ComponentType<DndProviderProps>
	/** Registers one item. A hook — same call order every render, like any other. */
	useSortableItem: (spec: DragSpec) => SortableItemHandle
}
