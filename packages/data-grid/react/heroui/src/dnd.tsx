'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { DragAxis, DragSurface } from '@ez-kit/data-grid-react'

import type {
	DndAdapter,
	DndDragOverEvent,
	DndDropEvent,
	DndProviderProps,
	DragSpec,
	SortableItemHandle,
} from '@ez-kit/data-grid-react'

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

/** The one character that joins an axis to a surface. Neither closed set contains it. */
const DRAG_KEY_SEPARATOR = ':'

/** The axes this adapter sets. dnd-kit's `Type` is `string | number | symbol`; these are strings. */
const DRAG_AXES: readonly string[] = [DragAxis.Row, DragAxis.Column]

/** The surfaces this adapter sets. */
const DRAG_SURFACES: readonly string[] = [DragSurface.Table, DragSurface.Panel]

/**
 * How one sortable's **partition** is spelled for dnd-kit: `<axis>:<surface>`.
 *
 * Three of the library's options take it — `type`, `accept` and `group` — and they do two different
 * jobs. `type` / `accept` gate *collisions*, so a row can never be a drop target for a column
 * header. `group` partitions the *index space*, which is what `OptimisticSortingPlugin` requires to
 * be dense (`0..n-1`) per group: it sorts each group's sortables by index and asserts the i-th has
 * `index === i`, bailing out of everything otherwise. Both jobs want the same partition, so both
 * get the same string.
 *
 * **Both halves are needed, and the panel is why.** Rows at `0..7` beside columns at `0..4` in one
 * group fail the density assertion at the second position — measured, and the failure is silent for
 * both axes. The column axis then turned out to have *two* index spaces of its own: the header
 * registers the visible leaves, the visibility panel every listed leaf including the hidden ones, and
 * those two lists have different lengths. So the axis alone does not partition it either.
 *
 * **This is not the composite `group` key the PRD removed in r3, and the difference is not cosmetic.**
 * That one encoded a column's pin band and its `parentId` to enforce boundaries mid-drag — facts
 * about data, carried in a string, which is why it needed an injective encoding against ids that may
 * contain the separator. Boundaries are enforced by `canDrop` and the core drop helpers instead.
 * What this joins is two closed sets of literals, neither of which contains `:` and neither of which
 * a caller supplies — so the encoding is injective by construction and {@link fromDragKey} refuses
 * anything else rather than guessing.
 */
function toDragKey(spec: Pick<DragSpec, 'axis' | 'surface'>): string {
	return `${spec.axis}${DRAG_KEY_SEPARATOR}${spec.surface}`
}

/**
 * Read a key back, or `null` when it is not one this adapter wrote.
 *
 * `null` covers every "not ours": another `DragDropProvider` in the tree, a droppable registered in
 * this one without a `type`, or a shape a future version of the library hands over. Refusing is the
 * right answer to all of them — a drag this adapter did not register is not one it can commit.
 */
function fromDragKey(key: string | number | symbol | undefined): Pick<DragSpec, 'axis' | 'surface'> | null {
	if (typeof key !== 'string') return null

	const parts = key.split(DRAG_KEY_SEPARATOR)
	if (parts.length !== 2) return null

	const [axis, surface] = parts
	if (axis === undefined || !DRAG_AXES.includes(axis)) return null
	if (surface === undefined || !DRAG_SURFACES.includes(surface)) return null

	return { axis: axis as DragSpec['axis'], surface: surface as DragSpec['surface'] }
}

/**
 * The identifier one sortable is **registered** under: its partition, then the grid's own id.
 *
 * **dnd-kit's registry is keyed by id across the whole manager — not per `group`, not per `type` —
 * and a second registration under an existing id replaces the first.** Measured, and the symptom was
 * severe: the column panel lists the same columns the header does, so both surfaces registered a
 * sortable called `name`. Opening the panel replaced the header's `name` draggable with the panel's,
 * whose element lives in a popover; closing it unregistered that entry outright. From the first time
 * the panel was opened, **the header's handle stopped starting a drag at all** — not a failed commit,
 * no pickup, and nothing in the DOM to show why. The same hazard exists across axes: a grid whose
 * `getRowId` returns a string that is also a column id would have collided before the panel existed.
 *
 * So the registered id carries the partition and the port's id stays the grid's own. The encoding is
 * injective without escaping anything, which is the part worth being precise about: the first two
 * segments are drawn from two closed sets of literals that contain no `:`, so
 * {@link fromSortableId} recovers the id by skipping exactly two separators — and an id containing
 * any number of `:` survives untouched.
 *
 * **This is not the composite key the PRD removed in r3, and the distinction is the same one
 * {@link toDragKey} draws.** That key encoded a column's pin band and its `parentId` — data, in order
 * to enforce boundaries mid-drag, which is why it needed an injective encoding of *caller* values.
 * Boundaries are still refused by `canDrop` and the core drop helpers. This prefix exists because the
 * library demands a unique id per registration and two surfaces legitimately show the same column.
 */
function toSortableId(spec: DragSpec): string {
	return `${toDragKey(spec)}${DRAG_KEY_SEPARATOR}${spec.id}`
}

/**
 * Recover the grid's own id from a registered one, or `null` when the shape is not this adapter's.
 *
 * Skips exactly two separators rather than splitting: an id may contain `:` and must come back
 * byte-identical, which is what makes the prefix safe to add at all.
 */
function fromSortableId(raw: string | number): string | null {
	const text = String(raw)
	const first = text.indexOf(DRAG_KEY_SEPARATOR)
	if (first === -1) return null
	const second = text.indexOf(DRAG_KEY_SEPARATOR, first + 1)
	if (second === -1) return null
	return text.slice(second + 1)
}

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

	const kind = fromDragKey(source.type)
	if (!kind) return null
	if (target.type !== source.type) return null

	/*
	 * `index` off the draggable, `initialIndex` off the sortable behind it — the draggable proxies
	 * only the first. Both are read through the sortable as a fallback so a future version that
	 * stops proxying costs nothing.
	 */
	const index = source.index ?? source.sortable?.index
	const initialIndex = source.sortable?.initialIndex
	if (typeof index !== 'number' || typeof initialIndex !== 'number') return null
	if (index === initialIndex) return null

	const sourceId = fromSortableId(source.id)
	if (sourceId === null) return null

	return { ...kind, sourceId, targetIndex: index }
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

	const kind = fromDragKey(source.type)
	if (!kind) return null
	if (target.type !== source.type) return null
	if (source.id === target.id) return null

	const sourceId = fromSortableId(source.id)
	const targetId = fromSortableId(target.id)
	if (sourceId === null || targetId === null) return null

	return { ...kind, sourceId, targetId }
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
	const key = toDragKey(spec)
	const { ref, handleRef, isDragging } = useSortable({
		/*
		 * The registry's id, not the grid's — see `toSortableId`. dnd-kit keys its registry by id across
		 * the whole manager, so two surfaces showing the same column would otherwise replace each
		 * other's registration and the header's handle would stop working the moment the panel opened.
		 */
		id: toSortableId(spec),
		index: spec.index,
		/*
		 * One partition for all three, computed once: `type` / `accept` gate collisions, `group`
		 * partitions the index space, and both jobs want the same answer — the item's axis *and* its
		 * surface. `toDragKey`'s docblock has the measurement and the reason the axis alone is not
		 * enough, which the visibility panel is what proved.
		 */
		type: key,
		accept: key,
		group: key,
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
