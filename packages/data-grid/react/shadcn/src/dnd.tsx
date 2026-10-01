'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { DragAxis, DragSurface } from '@ez-kit/data-grid-react'
import { useRef } from 'react'

import type {
	DndAdapter,
	DndDragOverEvent,
	DndDropEvent,
	DndProviderProps,
	DragSpec,
	SortableItemHandle,
} from '@ez-kit/data-grid-react'

/**
 * This kit's drag-and-drop adapter, built on `@dnd-kit/react` — and the only module here that names
 * a drag library.
 *
 * **Switching drag on is one field, and this file is the only thing you import for it:**
 *
 * ```tsx
 * import { adapter } from '@/components/data-grid/dnd'
 *
 * export const { DataGrid } = createDataGrid({ components: allComponents, cellTypes, features, dnd: adapter })
 * ```
 *
 * Nothing else imports it. A grid built without `dnd` renders exactly the DOM it rendered before —
 * no handle, `useDndEnabled()` false — and your bundler drops this module and the library with it,
 * because nothing reaches them. So the cost of having the file sitting here unused is zero bytes;
 * what it costs is the `@dnd-kit/react` line in your `package.json`, which came with the block.
 *
 * **Deleting it is safe and supported.** If you are never going to drag anything: remove this file
 * and drop `@dnd-kit/react` from your dependencies. Nothing else in the block references either.
 *
 * **The export is `adapter`, not `dndKitAdapter`** — a kit has exactly one, and the module name
 * already says what it is.
 *
 * dnd-kit applies its own transforms as inline styles on the elements the refs below land on. This
 * file authors no style and no class of its own.
 *
 * ---
 *
 * The rest of this docblock is for whoever edits the file. The two translation helpers below —
 * `toDropEvent` and `toDragOverEvent` — are where every refusal lives, and each refusal is a real
 * event the library delivers rather than a defensive check; their own docblocks say which. Two
 * measurements are worth keeping in view before changing anything:
 *
 * - **The index space of one axis and surface must be dense, `0..n-1`.** `OptimisticSortingPlugin`
 *   sorts each group's sortables by index and asserts the i-th has `index === i`, bailing out of
 *   everything otherwise — and its loop spans *every* group, so one broken space stops the others
 *   too. The failure is silent: handles work, the pointer moves, nothing commits.
 * - **The registered id must be unique across the whole manager.** dnd-kit's registry is keyed by
 *   id, and a second registration under an existing id replaces the first. See `toSortableId`.
 *
 * Both are the reason `type` / `accept` / `group` and the id carry the axis *and* the surface
 * rather than the axis alone.
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
			 * Where the item ended up, after the optimistic displacement — **declared and deliberately
			 * not read**, and that is worth stating rather than deleting.
			 *
			 * This adapter used to compare it with `initialIndex` to answer "did the item travel", and
			 * that comparison was unsound: the two numbers are not measured against the same list once
			 * a virtualized window has scrolled. {@link toDragAnchor} replaced it. Leaving both fields
			 * named here keeps a test able to construct the case that misfired, and keeps the next
			 * reader from reaching for them again.
			 */
			index?: number
			/**
			 * The sortable behind a sortable draggable. Absent on a plain one, which is how a drop that
			 * is not a sortable's is refused.
			 *
			 * `group` is the one member read: it is the index space the source belongs to, and therefore
			 * the set of items its anchor is looked for among. `initialIndex` is declared for the reason
			 * {@link SortableDragEndEvent.operation.source.index} is.
			 */
			sortable?: { index?: number; initialIndex?: number; group?: string | number | symbol }
		} | null
		target: { id: string | number; type?: string | number | symbol } | null
	}
}

/**
 * The shape this adapter reads out of dnd-kit's `dragstart` event: the source, and nothing else.
 *
 * Its own type rather than a reuse of {@link SortableDragEndEvent}, because a `dragstart` event carries
 * no `canceled` — casting one to the other is a conversion TypeScript rejects outright, which is how
 * this was caught. A `dragend` event *does* satisfy this one, so {@link sourceAnchor} takes it for both
 * ends of an operation and the two anchors are computed by the same code.
 */
export type SortableDragStartEvent = {
	operation: {
		source: {
			id: string | number
			type?: string | number | symbol
			sortable?: { group?: string | number | symbol }
		} | null
	}
}

/**
 * Which side of the source its anchor sits on.
 *
 * A const object plus a union of the same name rather than a bare literal union, per this repo's
 * closed-set convention.
 */
export const AnchorSide = {
	/** The item immediately before the source — the usual case. */
	Before: 'before',
	/** The item immediately after it, which is the answer only when the source is first. */
	After: 'after',
} as const

export type AnchorSide = (typeof AnchorSide)[keyof typeof AnchorSide]

/**
 * Where the source sits in its group, named by a **neighbour's id** rather than by a number.
 *
 * Both halves are compared. The side matters because a source that is first has no predecessor and is
 * anchored to its successor instead; if it stops being first, the side alone already says it moved.
 */
export type DragAnchor = {
	side: AnchorSide
	/**
	 * The neighbour's **registered** id — the `<axis>:<surface>:<id>` form, unparsed.
	 *
	 * Unparsed on purpose: an anchor is never reported onward, only compared with another anchor, so
	 * there is nothing to gain by stripping the prefix and something to lose — {@link fromSortableId}
	 * can answer `null`, which would turn an unfamiliar neighbour into a refused drop.
	 */
	id: string
}

/**
 * The slice of dnd-kit's manager this adapter reads: the registered droppables, which is where a
 * group's current order lives.
 *
 * Declared structurally for the reason {@link SortableDragEndEvent} is — the real type is generic over
 * four parameters and reaching it means naming `@dnd-kit/abstract`, a transitive dependency this
 * package does not declare. A sortable's droppable carries a back-reference to the sortable, which is
 * how `OptimisticSortingPlugin` enumerates a group too.
 */
export type SortableManager = {
	registry: {
		droppables: Iterable<{
			id: string | number
			sortable?: { index?: number; group?: string | number | symbol }
		}>
	}
}

/**
 * The source's anchor in its group as the registry currently stands, or `null` when there is none.
 *
 * **Why a neighbour's id and not an index.** The question this answers — did the item travel — used to
 * be `index === initialIndex`, and those two numbers are not measured against the same list. Both
 * facts are in the library:
 *
 * - `initialIndex` is **frozen at drag start**: the effect that seeds it
 *   (`@dnd-kit/dom@0.1.21/sortable.js:556-566`) runs on the transition into `dragging` and reads
 *   `this.index` inside `untracked()`, so no later change refreshes it.
 * - `index` is **rewritten mid-drag by React, unconditionally**: `useSortable`'s layout effect
 *   (`@dnd-kit/react@0.1.21/sortable.js:61-67`) assigns `sortable.index = index` whenever the prop
 *   changes, with no guard for an operation in flight. In a virtualized grid that prop is the row's
 *   position in the window the body is publishing *now*, which auto-scroll changes every frame. The
 *   sortable plugin writes the same property from its own ordering, so there are two writers that
 *   disagree — and that disagreement is the index drift {@link DndDropEvent} records.
 *
 * So the comparison had a reachable silent failure: the row at published position `0` dragged **down**
 * far enough for auto-scroll to carry the window past it is re-inserted at position `0` of the new
 * published list, giving `index === initialIndex` after a move of hundreds of rows — a drop refused
 * with nothing to show for it. The mirror case is position `n-1` dragged **up**.
 *
 * An anchor is immune to both writers because what is compared is an **id**. In that same case the
 * held row is still first, but its successor is now a row from the scrolled window rather than the
 * original one, so the anchor differs and the drop is reported.
 *
 * **How the neighbour is found: from the density invariant, not by sorting.** A group's indices are
 * required to be exactly `0..n-1` — the invariant the whole axis rests on, asserted by
 * `OptimisticSortingPlugin` and recorded on `DragSpec.index` — so the predecessor is simply the member
 * whose index is `sourceIndex - 1` and the successor the one at `sourceIndex + 1`. Two linear scans
 * find them: no sorted copy is allocated, and a group that is a whole virtual window costs `O(n)`
 * rather than `O(n log n)`. The registry is safe to walk twice because `EntityRegistry`'s
 * `[Symbol.iterator]` hands back a fresh `map.values()` each call rather than one shared iterator.
 *
 * **The residual, stated rather than hidden:** the lookup still rides on the indices, so a group whose
 * indices are momentarily duplicated can yield a neighbour that is not the visual one — the first match
 * in registry order wins. What that can cost is a wrong neighbour; it cannot cost the coincidence the
 * numbers suffered from, because two distinct ids do not compare equal the way two stale numbers do.
 */
export function toDragAnchor(manager: SortableManager, sourceId: string | number, group: unknown): DragAnchor | null {
	const { droppables } = manager.registry

	/** The id of the group's member at one index, or `null` when the group has no such position. */
	const memberAt = (index: number): string | null => {
		for (const entry of droppables) {
			if (entry.sortable && entry.sortable.group === group && entry.sortable.index === index) return String(entry.id)
		}

		return null
	}

	let sourceIndex: number | undefined
	for (const entry of droppables) {
		if (!entry.sortable || entry.sortable.group !== group) continue
		if (String(entry.id) !== String(sourceId)) continue
		sourceIndex = entry.sortable.index
		break
	}
	if (typeof sourceIndex !== 'number') return null

	const before = memberAt(sourceIndex - 1)
	if (before !== null) return { side: AnchorSide.Before, id: before }

	// First in its group, so it is anchored to what follows it. A group of one has neither, and
	// nothing to move within: `null` refuses the drop.
	const after = memberAt(sourceIndex + 1)

	return after === null ? null : { side: AnchorSide.After, id: after }
}

/**
 * Whether the source moved, by comparing the anchor it started with against the one it ended with.
 *
 * A missing anchor on either side is "did not travel": the source was not in its group's order, or the
 * group holds one item. Both are refusals rather than unknowns — there is no move to commit.
 */
export function hasTravelled(start: DragAnchor | null, end: DragAnchor | null): boolean {
	if (!start || !end) return false

	return start.side !== end.side || start.id !== end.id
}

/**
 * What {@link toDropEvent} needs beside the event, all of it gathered by {@link DndProvider} across
 * the operation rather than readable at its end.
 */
export type DropContext = {
	/** The last target the pointer was over that the grid allowed, or `null` if there was none. */
	hoveredTargetId: string | null
	/** The source's anchor at `dragstart` — see {@link toDragAnchor}. */
	startAnchor: DragAnchor | null
	/**
	 * The **last anchor recorded during the operation**, computed the same way — not one read at
	 * release. Equal to the first means it did not travel; see {@link DndProvider} for why it is
	 * recorded as the drag runs rather than recomputed at the end.
	 */
	endAnchor: DragAnchor | null
}

/**
 * Translate a completed drag into the port's {@link DndDropEvent}, or `null` when there is nothing
 * to commit.
 *
 * **`hoveredTargetId` is the landing place, because the library's own `target` is sound in neither
 * frame of a drag — and it is two different frames, which is the part worth not rediscovering.**
 *
 * *When the sortable plugin's move succeeds*, it finishes by calling
 * `manager.actions.setDropTarget(source.id)` — `@dnd-kit/dom@0.1.21/sortable.js:418`, the last line
 * of the `dragover` arm. So the operation's target becomes the **source**, and it stays that way:
 * `CollisionObserver.computeCollisions` does not skip the source's own droppable
 * (`@dnd-kit/abstract@0.1.21/index.js:394-412` — it skips a `disabled` entry and one that does not
 * `accept`, and nothing else), while the source element follows the pointer. Hence
 * `source.id === target.id` at `dragend`, measured every time, and every fixture in this file's
 * tests carries it. Reading `target.id` alone would refuse every ordinary drop as a self-drop.
 *
 * *When that move bails*, the target is left as the row the pointer is genuinely over. The move is a
 * microtask chain (`sortable.js:373-418`) that returns early when a group's indices are not dense or
 * when a registered sortable has gone — which is what a **virtualized** body's auto-scroll causes
 * continuously, since rows unmount and mount and React rewrites every survivor's index. So in that
 * frame the id is right and the indices are stale, which is the opposite of the first frame.
 *
 * Neither signal is therefore trustworthy on its own, and that is why the landing place is the last
 * target the pointer was over **that the grid allowed** — which {@link toDragOverEvent} already
 * computes on every frame to answer `canDrop`, filtering exactly the self-hover of the first frame.
 * {@link DndProvider} remembers it for the length of one operation and passes it here. The library's
 * `target` is still consulted, as a backstop for an operation that delivered no usable hover at all,
 * and still checked for its kind.
 *
 * **This replaced reporting `source.index` as a `targetIndex`, which the grid resolved against its
 * rendered-row list.** That was sound only while the list held still, which the second frame above is
 * exactly the case it does not. Instrumented on a 10 000-row grid, the index arrived 3–4 too high in
 * three runs out of three while the hovered id was right in all three. {@link DndDropEvent} has the
 * figures. Indices stay where they are meaningful — the sortable's own registration, and the two
 * refusals below — and never cross the port.
 *
 * Six refusals, and each one is a real event the library delivers:
 *
 * - **canceled** — the drag was aborted: `Escape`, or a programmatic cancel.
 * - **no source or target** — released over nothing. Not the canceled case: that arrives as
 *   `canceled: false` with a null `target`, which is why both refusals are needed.
 * - **no movement** — the item ended where it began, so there is nothing to commit and firing
 *   `onChange` would break the "exactly one per drag" promise with a zero. Answered by comparing the
 *   source's {@link DragAnchor} at the two ends of the operation, and it is **load bearing**: the
 *   remembered hover cannot replace it, because a drag that steps down two rows and comes back leaves
 *   that hover pointing at a row the item merely passed, and committing it would move a row the user
 *   put back. {@link toDragAnchor} has why the anchor is an id and not the index pair it replaced.
 * - **not a sortable's drop** — a plain draggable registered in the same provider. It sits in no index
 *   space, so it has no anchor.
 * - **a `type` this adapter did not set, on either end** — another `DragDropProvider` in the tree,
 *   or some other droppable registered in this one. Not ours, so not ours to commit.
 * - **no target but the source itself** — no hover was ever allowed and the library's value is the
 *   degenerate one. There is no landing place to name, so there is no drop.
 *
 * The target's kind is checked as well as the source's, and that is deliberate rather than belt and
 * braces. `accept` does gate collisions today — verified in `@dnd-kit/dom` — so a row cannot reach
 * a column. But `accept` is the only thing standing between a row drag and *any* droppable
 * registered in the same provider without one: a trash zone, a group header, anything a later phase
 * adds. One comparison closes that off, and costs nothing.
 *
 * ---
 *
 * **On the no-movement answer, which used to be `index === initialIndex` and is now an anchor.** That
 * comparison was unsound in a virtualized body, because the two numbers are measured against
 * different lists once the window has scrolled — one frozen at drag start, one rewritten by React
 * every frame — and it silently refused a real drop in two reachable gestures. The full account, with
 * the library citations and the gestures, is on {@link toDragAnchor}; the one-line version is that an
 * id does not coincide the way a stale number does.
 *
 */
export function toDropEvent(event: SortableDragEndEvent, context: DropContext): DndDropEvent | null {
	if (event.canceled) return null

	const { source, target } = event.operation
	if (!source || !target) return null

	const kind = fromDragKey(source.type)
	if (!kind) return null
	if (target.type !== source.type) return null

	// A plain draggable has no sortable behind it, so it has no place in any index space and no
	// anchor to have moved away from. Not a sortable's drop, so not this adapter's to commit.
	if (!source.sortable) return null
	if (!hasTravelled(context.startAnchor, context.endAnchor)) return null

	const sourceId = fromSortableId(source.id)
	if (sourceId === null) return null

	/*
	 * The remembered hover first, the library's own target only when there was none. That order is
	 * the point rather than a preference: a hover the grid refused was never remembered, so falling
	 * back to the library's value *ahead* of the remembered one would commit against the illegal
	 * item the pointer happened to rest on and throw away the legal position the item was displaced
	 * to. The backstop exists for an operation that delivered no usable `dragover` at all.
	 */
	const reported = fromSortableId(target.id)
	const targetId = context.hoveredTargetId ?? reported
	if (targetId === null || targetId === sourceId) return null

	return { ...kind, sourceId, targetId }
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
 * place it is going and the plugin sets the drop target to it outright
 * (`@dnd-kit/dom@0.1.21/sortable.js:418`), so the collision resolves to the source on nearly every
 * later frame — the first of the two frames {@link toDropEvent} describes. Treating that as a refusal
 * would prevent every legal step after the first.
 *
 * Filtering it is also what makes this the one honest source of a landing place: every non-null
 * answer here names a target that is genuinely a different item, so {@link DndProvider} can remember
 * the last one the grid allowed and report it as the drop's `targetId`.
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

/**
 * The source's anchor for whichever operation the given event belongs to, or `null` when there is no
 * source, no group to look in, or no neighbour.
 *
 * One helper so `dragstart` and every `dragover` compute it identically — the comparison is only
 * meaningful if both ends are measured the same way.
 *
 * The group comes from the sortable, falling back to the draggable's `type`: this adapter sets `group`
 * and `type` to the same partition string (see {@link toDragKey}), so the fallback is exact rather
 * than approximate, and it covers a version that stops exposing `group` on the sortable.
 */
function sourceAnchor(event: SortableDragStartEvent, manager: SortableManager): DragAnchor | null {
	const { source } = event.operation
	if (!source) return null

	const group = source.sortable?.group ?? source.type
	if (group === undefined) return null

	return toDragAnchor(manager, source.id, group)
}

function DndProvider({ onDrop, canDrop, children }: DndProviderProps) {
	/*
	 * The last target the pointer was over **and the grid allowed**, for the length of one operation.
	 *
	 * This is where the drop's landing place comes from, and it has to be remembered rather than read
	 * at release because the library overwrites its own target with the source after every optimistic
	 * displacement — `toDropEvent` has the measurement. A ref rather than state: nothing renders from
	 * it, and a re-render per hover would be a re-render per pointer frame.
	 */
	const hoveredTargetId = useRef<string | null>(null)
	/*
	 * The source's neighbour at pickup, which is what "did it travel" is answered against. Taken here
	 * because it has to be read **before** the first displacement; `toDragAnchor` has why it is a
	 * neighbour's id rather than the index pair this replaced.
	 */
	const startAnchor = useRef<DragAnchor | null>(null)
	/*
	 * The other end of the pair, **recorded as the drag runs and never recomputed at release** — and
	 * that timing is the whole point of the ref rather than an optimisation.
	 *
	 * `sortable.index` has two writers that do not coordinate. `OptimisticSortingPlugin` writes it
	 * from its own displacement, and `useSortable`'s layout effect writes it from the index prop —
	 * `@dnd-kit/react@0.1.21/sortable.js:61-67`, which assigns `sortable.index = index` whenever the
	 * prop changes, with no guard for an operation in flight. In a virtualized grid that prop is the
	 * row's position in the list the body is publishing, which is the **undisplaced** order. So any
	 * re-render landing between the last displacement and the release resets every index in the group
	 * to the order the drag started from, making a freshly computed end anchor equal the start one and
	 * refusing a real move with nothing to show for it. Reachable: a grid with `infinite` whose
	 * `loadMore` promise resolves while a row is held.
	 *
	 * Recording leaves nothing to corrupt. A `dragover` arrives on every frame the operation is live,
	 * **including the one the plugin itself causes** right after it displaces: it finishes by calling
	 * `manager.actions.setDropTarget(source.id)` (`@dnd-kit/dom@0.1.21/sortable.js:409-418`, after the
	 * `batch()` that writes the new indices), and `setDropTarget` dispatches `dragover` synchronously
	 * when the target changes (`@dnd-kit/abstract@0.1.21/index.js:662-677`). That frame is the one
	 * whose registry reflects the displacement, which is why the anchor is taken on *every* hover and
	 * not only on the ones the grid allows — `toDragOverEvent` filters the source hovering itself,
	 * correctly, for the question it answers.
	 *
	 * The semantics the pair had are unchanged **once a displacement has rendered**. A pointer that
	 * never moved produces no `dragover` with anything displaced, so the recorded anchor is the start
	 * one or absent and the drop is refused. A drag released back at its origin records the origin's
	 * own neighbour last, so it is refused too. A row dragged out of a scrolled window records the new
	 * window's neighbour, so it is reported.
	 *
	 * **The qualifier is a real residual, and it is this.** The whole chain above is gated on
	 * `renderer.rendering.then`, so it costs at least one frame. Nothing can interleave *inside* the
	 * microtask — the `batch()`, the `setDropTarget(source.id)` and its synchronous re-dispatch all run
	 * in one, and a `pointerup` task cannot cut into a microtask, so the self-target frame is
	 * guaranteed within it. But a release arriving **before that promise settles** reaches `dragend`
	 * with the recorded anchor one move stale, and that goes wrong in both directions: a single-step
	 * drag released sub-frame has `endAnchor === startAnchor` and is silently refused, while a drag
	 * returned to its origin and released sub-frame has the one-step-away anchor recorded and commits a
	 * one-row move nobody made — with the `targetId` of the last allowed hover. Multi-step drags are
	 * unaffected, since the second-to-last recorded anchor already differs from the start one and the
	 * `targetId` never depended on the anchor. The window is about one frame of release latency: rare
	 * for a hand, plausible for synthetic input, and the kits' different auto-scroll speeds make it the
	 * kind of thing that would show up on one kit and not the other.
	 *
	 * **Both cheap arrangements were considered and neither closes it.** ORing the recorded anchor with
	 * one freshly computed at `dragend` fixes the refusal and leaves the spurious commit, because the
	 * fresh anchor is the stale-index one this ref exists to avoid; ANDing them fixes the spurious
	 * commit and brings the refusal back, for the same reason. There is no arrangement of the two that
	 * answers both, and the exposure does not earn a complicated one — so it is recorded here rather
	 * than engineered around.
	 *
	 * **A second, unrelated loss sits upstream, and the refusal it produces is correct.** In a
	 * **virtualized** body a one-step drag commits only while the dragged row's top stays above the
	 * neighbour's top. Past that point `OptimisticSortingPlugin` displaces the neighbour and
	 * un-displaces it on alternating frames — the raw target flips between the neighbour and the source
	 * — so at release the rows are physically back in their original arrangement, nothing has moved,
	 * and refusing is the right answer: the defect is the displacement the plugin lost, not the
	 * comparison here. Measured by sweeping the pointer within the neighbour one step down: it commits
	 * at 0.25 of the row's height and not at 0.75 or 0.95, with the two kits differing at 0.50 only
	 * because their handles sit a few pixels apart in the row. Two or more steps are unaffected at
	 * every position, and a non-virtual body commits everywhere — a virtualized row is placed by
	 * `transform`, so its rect travels with the pointer while its neighbours' stay put. **A collision
	 * detection override that excludes the dragged row was tried and measured to change the outcome not
	 * at all**, delta for delta, because the un-displacing frames are the plugin's own explicit
	 * `setDropTarget(source.id)` rather than collisions — nothing an adapter configures reaches them.
	 */
	const endAnchor = useRef<DragAnchor | null>(null)

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
			onDragStart={(event, manager) => {
				// A fresh operation inherits nothing: all three refs are set from this operation alone,
				// and `dragend` clears them again for one whose end never reaches that handler.
				hoveredTargetId.current = null
				startAnchor.current = sourceAnchor(event as SortableDragStartEvent, manager)
				endAnchor.current = null
			}}
			onDragOver={(event, manager) => {
				/*
				 * Before the gate, and on every hover rather than only the allowed ones: a `dragover` is
				 * the only moment at which the registry reflects a displacement, and the frame reflecting
				 * the *last* one is the one whose target is the source itself. The ref's docblock has the
				 * library citations. Computed here rather than inside `toDropEvent`, so that function
				 * stays a pure translation the unit tests can drive without a manager.
				 */
				endAnchor.current = sourceAnchor(event as SortableDragStartEvent, manager)

				const over = toDragOverEvent(event as SortableDragOverEvent)
				if (!over) return
				if (!canDrop(over)) {
					event.preventDefault()
					return
				}
				// Remembered only once allowed: a refused hover must not become the landing place, or
				// the commit would be refused again and the legal position already displaced to lost.
				hoveredTargetId.current = over.targetId
			}}
			onDragEnd={(event) => {
				const drop = toDropEvent(event as SortableDragEndEvent, {
					hoveredTargetId: hoveredTargetId.current,
					startAnchor: startAnchor.current,
					endAnchor: endAnchor.current,
				})
				hoveredTargetId.current = null
				startAnchor.current = null
				endAnchor.current = null
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
