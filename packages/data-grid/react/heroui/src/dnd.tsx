'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { DragAxis } from '@ez-kit/data-grid-react'

import type { DndAdapter, DndDropEvent, DndProviderProps, DragSpec, SortableItemHandle } from '@ez-kit/data-grid-react'

/**
 * The HeroUI kit's drag-and-drop adapter, built on `@dnd-kit/react`.
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
		source: { id: string | number; type?: string | number | symbol } | null
		target: { id: string | number; type?: string | number | symbol } | null
	}
}

/**
 * Translate a completed drag into the port's {@link DndDropEvent}, or `null` when there is nothing
 * to commit.
 *
 * Four refusals, and each one is a real event dnd-kit delivers:
 *
 * - **canceled** — the drag was aborted: `Escape`, or a programmatic cancel.
 * - **no target** — released over nothing. Note this is *not* the canceled case: dnd-kit reports
 *   it as `canceled: false` with a null `target`, which is why both refusals are needed.
 * - **self-drop** — released on the item it was picked up from. Forwarding it would make the grid
 *   commit a no-op move and fire `onChange` for nothing, breaking the "exactly one `onChange` per
 *   drag" promise.
 * - **a `type` this adapter did not set, on either end** — another `DragDropProvider` in the tree,
 *   or some other droppable registered in this one. Not ours, so not ours to commit.
 *
 * The **target** is checked as well as the source, and that is deliberate rather than belt and
 * braces. `accept` does gate collisions today — verified in `@dnd-kit/dom`, and a sortable's
 * droppable does carry the `type` its item was registered with — so a row cannot currently collide
 * with a column. But `accept` is the only thing standing between a row drag and *any* droppable
 * registered in the same provider without one: a trash zone, a group header, anything a later
 * phase adds. Such a drop would arrive here with a foreign `target.id` and commit it. One
 * comparison closes that off, and costs nothing.
 *
 * The ids are the source of truth, matching the core drop helpers' own convention; no direction and
 * no indices are derived here.
 */
export function toDropEvent(event: SortableDragEndEvent): DndDropEvent | null {
	if (event.canceled) return null

	const { source, target } = event.operation
	if (!source || !target) return null
	if (source.id === target.id) return null

	const axis = source.type
	if (typeof axis !== 'string' || !DRAG_AXES.includes(axis)) return null
	if (target.type !== axis) return null

	return { axis: axis as DndDropEvent['axis'], sourceId: String(source.id), targetId: String(target.id) }
}

function DndProvider({ onDrop, children }: DndProviderProps) {
	return (
		<DragDropProvider
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
