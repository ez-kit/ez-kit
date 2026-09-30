'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { DragAxis } from '@ez-kit/data-grid-react'

import type {
	DndAdapter,
	DndDragOverEvent,
	DndDropEvent,
	DndProviderProps,
	DragSpec,
	SortableItemHandle,
} from '@ez-kit/data-grid-react'

/**
 * The shadcn kit's drag-and-drop adapter, built on `@dnd-kit/react`.
 *
 * **This module is the only place in the repository that names a drag library, and it is imported
 * by nothing else in this package.** That is the whole delivery shape: `@dnd-kit/react` is an
 * *optional* peer, this module gets its own build entry (`dist/dnd.js`), and the kit root — which
 * is "everything by construction", since `data-grid.tsx` binds every component and every feature —
 * never reaches it. An import of `./dnd` from `index.ts` or `data-grid.tsx` would make the peer a
 * required install for every existing consumer of this kit; `apps/docs/test/tree-shaking.test.ts`
 * asserts it stays absent from a bundle of the root, and asserts it is present in a bundle of this
 * subpath so that the first assertion cannot pass for the wrong reason.
 *
 * **The export is `adapter`, not `dndKitAdapter`.** That breaks symmetry with the sibling
 * precedent `reactRouterAdapter` (`store-persist/src/url/react-router.ts`) deliberately: a kit has
 * exactly one drag adapter and the subpath already names it, so
 * `import { adapter } from '@ez-kit/data-grid-heroui/dnd'` reads correctly at the call site. The
 * PRD's decisions log records this; do not "restore" the symmetry.
 *
 * Its `size-limit` entry measures **this module alone**: `size-limit` excludes peer dependencies,
 * so the number is the adapter's own code and says nothing about what drag costs a consumer who
 * installs the peer. Read it as a regression check on the adapter, not as a budget for the feature.
 *
 * dnd-kit applies its own transforms as inline styles on the elements the refs land on. The
 * no-styles rule governs `@ez-kit/data-grid-react`, not a kit — and even there the test is
 * authorship, not the attribute. Nothing here writes a style or a class.
 */

/** dnd-kit's `Type` is `string | number | symbol`; the two this adapter ever sets are the axes. */
const DRAG_AXES: readonly string[] = [DragAxis.Row, DragAxis.Column]

/**
 * The shape this adapter reads out of dnd-kit's `dragend` event.
 *
 * Declared structurally rather than imported: the real type is generic over four parameters
 * (`DragDropEvents<U, V, W>['dragend']`) and reaching it means naming `@dnd-kit/abstract`, which is
 * a transitive dependency this package does not declare. The four fields below are all that is
 * read, and {@link toDropEvent} is exercised directly by the unit tests — which is the reason it
 * is a named function rather than an inline closure.
 */
export type SortableDragEndEvent = {
	canceled: boolean
	operation: {
		source: {
			id: string | number
			type?: string | number | symbol
			/**
			 * Where the item ended up, after the optimistic displacement — the landing place.
			 *
			 * The draggable proxies this one; it does **not** proxy `initialIndex`, which lives on the
			 * sortable beside it. Measured, not assumed: reading `initialIndex` off the draggable
			 * yields `undefined` and refuses every real drop.
			 */
			index?: number
			/** The sortable behind a sortable draggable. Absent on a plain one. */
			sortable?: { index?: number; initialIndex?: number }
		} | null
		target: { id: string | number; type?: string | number | symbol } | null
	}
}

/**
 * Translate a completed drag into the port's {@link DndDropEvent}, or `null` when there is nothing
 * to commit.
 *
 * **The landing place is `source.index`, not the target's id, and that is not a shortcut.** A
 * sortable displaces its neighbours optimistically while the drag is in flight, so at `dragend` the
 * source already sits where it is going and the collision resolves to **itself** — measured, every
 * time: `source.id === target.id`. Reading the target's id here would refuse every real drop as a
 * self-drop. dnd-kit's own `move()` helper falls back to `initialIndex` → `index` for the same
 * reason. The target is still read, but only to check the drop is ours.
 *
 * Five refusals, and each one is a real event the library delivers:
 *
 * - **canceled** — the drag was aborted: `Escape`, or a programmatic cancel.
 * - **no source or target** — released over nothing. Not the canceled case: that arrives as
 *   `canceled: false` with a null `target`, which is why both refusals are needed.
 * - **no movement** — the item ended where it began, so there is nothing to commit and firing
 *   `onChange` would break the "exactly one per drag" promise with a zero.
 * - **a `type` this adapter did not set, on either end** — another `DragDropProvider` in the tree,
 *   or some other droppable registered in this one. Not ours, so not ours to commit.
 *
 * The target's kind is checked as well as the source's, and that is deliberate rather than belt and
 * braces. `accept` does gate collisions today — verified in `@dnd-kit/dom` — so a row cannot reach
 * a column. But `accept` is the only thing standing between a row drag and *any* droppable
 * registered in the same provider without one: a trash zone, a group header, anything a later phase
 * adds. One comparison closes that off, and costs nothing.
 */
export function toDropEvent(event: SortableDragEndEvent): DndDropEvent | null {
	if (event.canceled) return null

	const { source, target } = event.operation
	if (!source || !target) return null

	const axis = source.type
	if (typeof axis !== 'string' || !DRAG_AXES.includes(axis)) return null
	if (target.type !== axis) return null

	/*
	 * `index` off the draggable, `initialIndex` off the sortable behind it — the draggable proxies
	 * only the first. Both are read through the sortable as a fallback so a future version that
	 * stops proxying costs nothing.
	 */
	const index = source.index ?? source.sortable?.index
	const initialIndex = source.sortable?.initialIndex
	if (typeof index !== 'number' || typeof initialIndex !== 'number') return null
	if (index === initialIndex) return null

	return { axis: axis as DndDropEvent['axis'], sourceId: String(source.id), targetIndex: index }
}

/**
 * The shape this adapter reads out of dnd-kit's `dragover` event, and the one member of it that
 * matters beyond the two ends: `preventDefault`.
 *
 * Declared structurally for the reason {@link SortableDragEndEvent} is — the real type is generic
 * over four parameters and reaching it means naming `@dnd-kit/abstract`, a transitive dependency
 * this package does not declare.
 */
export type SortableDragOverEvent = {
	operation: {
		source: { id: string | number; type?: string | number | symbol } | null
		target: { id: string | number; type?: string | number | symbol } | null
	}
	preventDefault: () => void
}

/**
 * Translate a hover into the port's {@link DndDragOverEvent}, or `null` when there is no question
 * to ask.
 *
 * `null` for three reasons, and the third is the one worth stating: **the source hovering itself is
 * normal, not an error.** Once the sortable has displaced its neighbours the source occupies the
 * place it is going, so the collision resolves to it — the same degeneracy that made an id-based
 * *drop* target unusable (see {@link toDropEvent}). Treating that as a refusal would prevent every
 * legal step after the first.
 *
 * A named function rather than an inline closure so the unit tests can exercise it directly, which
 * is the only way to reach it: nothing about a hover is observable in jsdom.
 */
export function toDragOverEvent(event: SortableDragOverEvent): DndDragOverEvent | null {
	const { source, target } = event.operation
	if (!source || !target) return null

	const axis = source.type
	if (typeof axis !== 'string' || !DRAG_AXES.includes(axis)) return null
	if (target.type !== axis) return null
	if (source.id === target.id) return null

	return { axis: axis as DndDragOverEvent['axis'], sourceId: String(source.id), targetId: String(target.id) }
}

function DndProvider({ onDrop, canDrop, children }: DndProviderProps) {
	return (
		<DragDropProvider
			/*
			 * `preventDefault()` is how this library is told a hover is not a landing place, and it is
			 * a first-class answer rather than a trick: `DragActions.setDropTarget` dispatches this
			 * event and **returns** `event.defaultPrevented`, its own JSDoc calling that "true if the
			 * drop was prevented".
			 *
			 * **What it suppresses is the displacement, not the target.** Read rather than assumed:
			 * `setDropTarget` assigns `dragOperation.targetIdentifier` *before* dispatching, and its
			 * only caller — the collision notifier — ignores the flag it gets back. So the illegal
			 * item remains the operation's target for as long as the pointer is over it; what does
			 * not happen is the sortable plugin's `move()` and the index reassignment that comes with
			 * it, because that arm reads `defaultPrevented` first. That is all the grid needs — see
			 * `DndProviderProps.canDrop` for why undoing a displacement afterwards is not available —
			 * but it is also why the grid's commit-time guards still earn their place, and why a kit
			 * that one day styles a drop target would need more than this.
			 *
			 * Synchronous on purpose: the plugin reads `defaultPrevented` in a microtask queued from
			 * the same dispatch, so a handler that deferred its answer would arrive too late. Which
			 * listener runs first does not matter, since both run inside the dispatch and the
			 * microtask reads the flag after them.
			 */
			onDragOver={(event) => {
				const over = toDragOverEvent(event as SortableDragOverEvent)
				if (over && !canDrop(over)) event.preventDefault()
			}}
			onDragEnd={(event) => {
				const drop = toDropEvent(event as SortableDragEndEvent)
				if (drop) onDrop(drop)
			}}
		>
			{children}
		</DragDropProvider>
	)
}

function useSortableItem(spec: DragSpec): SortableItemHandle {
	const { ref, handleRef, isDragging } = useSortable({
		id: spec.id,
		index: spec.index,
		// The axis is both what this item **is** and what it accepts, which is what keeps the two
		// orders from colliding: without `accept`, a row would be a valid drop target for a column
		// header. The port has no other mechanism for this — the PRD's r3 revision removed the
		// composite `group` key that would have been the alternative.
		type: spec.axis,
		accept: spec.axis,
		/*
		 * And the axis is the sortable's **group**, which is a different job from the two above:
		 * `type` / `accept` gate collisions, `group` partitions the *index space*. Measured in
		 * `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`: it sorts each group's registered
		 * sortables by index and asserts the i-th has `index === i`. Left unset, every sortable in
		 * a grid lands in one group — so rows at 0..7 beside columns at 0..4 fail that assertion at
		 * the second position, the plugin returns early, and **both** axes stop displacing and stop
		 * committing (`sortable.index` is never updated, so `toDropEvent` sees no movement).
		 *
		 * This is **not** the composite `group` key the PRD removed in r3: that one encoded the pin
		 * band and `parentId` to enforce boundaries mid-drag, and boundaries are still refused at
		 * the commit. This carries the axis and nothing else.
		 */
		group: spec.axis,
		// `exactOptionalPropertyTypes`: omitted is not the same as `undefined`, and dnd-kit's types
		// are not written under that flag. This is the boundary where that mismatch is paid for.
		...(spec.disabled !== undefined ? { disabled: spec.disabled } : {}),
	})

	// Mapped member by member rather than spread: the hook returns eight, the port declares three,
	// and an upstream addition must not silently widen what this kit promises.
	return { ref, handleRef, isDragging }
}

export const adapter: DndAdapter = {
	Provider: DndProvider,
	useSortableItem,
}
