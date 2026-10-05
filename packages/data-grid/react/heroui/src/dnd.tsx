'use client'

import { Accessibility, AutoScroller, Cursor, Feedback, PreventSelection } from '@dnd-kit/dom'
import { DragDropProvider, KeyboardSensor, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { DragAxis, DragInput, DragSurface } from '@ez-kit/data-grid-react'
import { useCallback, useMemo, useRef } from 'react'

import type {
	DndAdapter,
	DndAnnouncements,
	DndDragOverEvent,
	DndDragSourceEvent,
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

/** `PointerEvent.pointerType` for a mouse. */
const POINTER_TYPE_MOUSE = 'mouse'

/** `PointerEvent.pointerType` for a finger. */
const POINTER_TYPE_TOUCH = 'touch'

/**
 * `Node.ELEMENT_NODE`, as a number rather than through the global: `Node` is bound to one realm, and
 * every docs example renders the grid inside an iframe.
 */
const ELEMENT_NODE_TYPE = 1

/** The elements a caret can sit in, by tag name. */
const TEXT_INPUT_TAG_NAMES: readonly string[] = ['INPUT', 'TEXTAREA']

/** The attribute that makes anything else one. */
const CONTENT_EDITABLE_ATTRIBUTE = 'contenteditable'

/** The one value of it that means "no". */
const CONTENT_EDITABLE_FALSE = 'false'

/**
 * How far a pointer must travel from the handle before a drag starts, in CSS pixels.
 *
 * **Adopted from the library rather than chosen here:** `@dnd-kit/dom@0.1.21`'s pointer sensor
 * applies `distance: { value: 5 }` to every pointer it constrains (`index.js:1545-1548`). It is
 * named and passed explicitly because of the one path that constraint never reached — see
 * {@link dragActivationConstraints}.
 */
const DRAG_DISTANCE_PX = 5

/**
 * How long a finger must rest on the handle before a drag starts. The library's 250 ms
 * (`index.js:1535-1538`).
 */
const DRAG_TOUCH_DELAY_MS = 250

/**
 * How far a finger may stray during that delay before the gesture is left to the scroller. The
 * library's 5 px (`index.js:1535-1538`).
 */
const DRAG_TOUCH_TOLERANCE_PX = 5

/**
 * How long any other pointer must rest before a drag starts. The library's 200 ms, which it applies
 * to both of its remaining branches — the text field (`index.js:1540-1544`) and everything else
 * (`index.js:1545-1548`).
 */
const DRAG_HOLD_DELAY_MS = 200

/** How far it may stray during that delay. The library's 10 px (`index.js:1545-1548`). */
const DRAG_HOLD_TOLERANCE_PX = 10

/**
 * How far a pointer resting in a text field may stray before the gesture is left to the caret: not
 * at all. The library's `0` (`index.js:1540-1544`), and {@link dragActivationConstraints} has why it
 * is load bearing here rather than defensive.
 */
const DRAG_TEXT_INPUT_TOLERANCE_PX = 0

/**
 * Whether a pointer event's target is an element at all.
 *
 * Reimplemented rather than imported: the library's `isElement` is exported from
 * `@dnd-kit/dom/utilities` (`utilities.js:1317-1320`), and `@dnd-kit/dom` is a transitive dependency
 * this package does not declare — the two sensor classes are reached through `@dnd-kit/react`'s
 * re-export of them, which these guards have no equivalent of.
 */
function isElementTarget(target: EventTarget | null): target is Element {
	return target !== null && (target as Node).nodeType === ELEMENT_NODE_TYPE
}

/**
 * Whether the pointer came down on the source's handle, or on something inside it — upstream's own
 * condition (`index.js:1532`).
 *
 * `false` when the sortable rendered **no** handle, which is a reachable composition rather than a
 * defect: see {@link dragActivationConstraints}.
 */
function isOnHandle(target: EventTarget | null, handle: Element | undefined): boolean {
	if (!isElementTarget(target) || !handle) return false

	return handle === target || handle.contains(target)
}

/**
 * Whether the target is a text field — an `<input>`, a `<textarea>`, or anything `contenteditable`.
 * The library's own test (`utilities.js:1341-1349`), reimplemented for the reason
 * {@link isElementTarget} is.
 */
function isTextInputTarget(target: EventTarget | null): boolean {
	if (!isElementTarget(target)) return false
	if (TEXT_INPUT_TAG_NAMES.includes(target.tagName)) return true

	const editable = target.getAttribute(CONTENT_EDITABLE_ATTRIBUTE)

	return editable !== null && editable !== CONTENT_EDITABLE_FALSE
}

/**
 * The activation constraints this adapter sets, in dnd-kit's own vocabulary: a drag starts once the
 * pointer has travelled `distance.value`, or once it has rested for `delay.value` without straying
 * further than `delay.tolerance` (`index.js:1689-1703`).
 *
 * Declared structurally for the reason {@link SortableDragEndEvent} is — the library's own
 * `ActivationConstraints` is exported from `@dnd-kit/dom`, a transitive dependency this package does
 * not declare.
 */
export type DragActivationConstraints = {
	delay?: { value: number; tolerance: number }
	distance?: { value: number }
}

/** The slice of the `PointerEvent` the constraints read. */
export type DragActivationEvent = Pick<PointerEvent, 'pointerType' | 'target' | 'defaultPrevented'>

/**
 * The slice of dnd-kit's `Draggable` they read: its handle, which a sortable need not have.
 *
 * `Element | undefined` rather than `| null`, because that is what the library's own `Draggable`
 * declares and `exactOptionalPropertyTypes` makes the difference a type error at the boundary.
 */
export type DragActivationSource = { handle?: Element | undefined }

/**
 * What must happen after a `pointerdown` before a drag starts, given the event **and the draggable
 * it was bound for**.
 *
 * Both arguments are upstream's own, and the second is why: the branch that matters most here is
 * conditional on the **handle**, not on the pointer type alone (`index.js:1532`). Every number is
 * adopted from that default rather than invented (`index.js:1528-1550`), the four branches are its
 * four in its order, and **exactly one of them deviates**.
 *
 * - **a mouse on the handle** — upstream returns `undefined`: no distance and no delay, so the drag
 *   begins on the `pointerdown` itself and a click that twitches one pixel is a drag. It now gets
 *   the same `distance` upstream applies to every pointer it does constrain, and still no delay,
 *   because pressing a handle and holding still with a mouse should start nothing. **This is the
 *   only deviation, and the whole behavioural change in this module.**
 * - **touch** — upstream's delay and tolerance verbatim: a finger that strays first is scrolling.
 * - **a text field** — upstream's `tolerance: 0` verbatim, and it is load bearing rather than
 *   defensive, because **a sortable need not render a handle**. `dragHandle` is a *render argument*
 *   of `<DataGrid.HeaderCell>` and `<RowDragHandle/>` an offered child, while the sortable is
 *   registered on the `<th>` or the row either way — so a header written without one is a draggable
 *   element containing that column's filter input. Dragging a few pixels to select text in it would
 *   otherwise cross {@link DRAG_DISTANCE_PX} and start a column drag mid-selection; upstream
 *   abandons the drag on the first pixel instead, and so does this.
 * - **anything else** (a pen, a mouse that came down outside the handle, and whatever a later
 *   pointer type turns out to be) — upstream's values verbatim.
 *
 * Exported so the unit tests can drive it — nothing about an activation constraint is observable in
 * jsdom, for the reason recorded at the top of `dnd.test.tsx`.
 */
export function dragActivationConstraints(
	event: DragActivationEvent,
	source: DragActivationSource,
): DragActivationConstraints {
	const { pointerType, target } = event

	if (pointerType === POINTER_TYPE_MOUSE && isOnHandle(target, source.handle)) {
		return { distance: { value: DRAG_DISTANCE_PX } }
	}

	if (pointerType === POINTER_TYPE_TOUCH) {
		return { delay: { value: DRAG_TOUCH_DELAY_MS, tolerance: DRAG_TOUCH_TOLERANCE_PX } }
	}

	if (isTextInputTarget(target) && !event.defaultPrevented) {
		return { delay: { value: DRAG_HOLD_DELAY_MS, tolerance: DRAG_TEXT_INPUT_TOLERANCE_PX } }
	}

	return {
		delay: { value: DRAG_HOLD_DELAY_MS, tolerance: DRAG_HOLD_TOLERANCE_PX },
		distance: { value: DRAG_DISTANCE_PX },
	}
}

/**
 * The sensors this adapter mounts — and **listing them at all is opting out of the library's
 * preset**, which is the one hazard in this block.
 *
 * `defaultPreset.sensors` is `[PointerSensor, KeyboardSensor]` (`index.js:1819-1822`) and
 * `DragDropManager` falls back to it only while `sensors` is absent (`index.js:1825-1831`). So the
 * keyboard sensor is named here purely to keep it: a keyboard drag has worked since the handle
 * existed, its activation is already handle-only — `event.target === (source.handle ??
 * source.element)` (`index.js:1351-1356`) — and its keys are the library's (`Space` / `Enter` to
 * pick up and to drop, the four arrows to move, `Escape` to cancel, `Tab` to drop). Nothing about
 * it is configured; omitting it would have deleted it. `dnd.test.tsx` asserts it is in this array
 * rather than trusting the diff.
 *
 * Module scope rather than inline, and not because a per-render array would be wasted: the provider
 * **reassigns** `manager.sensors` whenever the array's identity changes
 * (`@dnd-kit/react@0.1.21/index.js:163-164`), so a fresh one per render re-instantiates the sensors
 * — including in the middle of a gesture one of them is driving.
 */
const DRAG_SENSORS = [PointerSensor.configure({ activationConstraints: dragActivationConstraints }), KeyboardSensor]

/**
 * The plugins this adapter mounts — and **listing them at all is opting out of the library's
 * preset**, exactly as {@link DRAG_SENSORS} is. This array is the same hazard one axis over, and it
 * is the more dangerous one, because four of the five are listed purely to keep them.
 *
 * `defaultPreset.plugins` is `[Accessibility, AutoScroller, Cursor, Feedback, PreventSelection]`
 * (`@dnd-kit/dom@0.1.21/index.js:1819-1821`) and `DragDropManager` falls back to it only while
 * `plugins` is absent (`index.js:1825-1831`). Nothing merges: omit `AutoScroller` and a drag stops
 * scrolling a long grid, omit `Cursor` and the grab cursor goes, omit `Feedback` and the dragged
 * element stops following the pointer, omit `PreventSelection` and a drag selects text as it goes.
 * All four failures are silent, and all four look like a drag that was never built rather than one
 * that lost a plugin. `dnd.test.tsx` asserts this array against the library's own preset rather
 * than trusting the diff — so a version that grows a sixth plugin fails there too.
 *
 * The preset's list is the whole exposure: `ScrollListener` and `Scroller` are prepended to
 * whatever `plugins` is given (`index.js:1831-1832`), so those two cannot be lost this way.
 *
 * **Imported from `@dnd-kit/dom` rather than from `@dnd-kit/react`, which is why this kit declares
 * both.** The latter re-exports exactly three names from the former — `DragDropManager`,
 * `KeyboardSensor`, `PointerSensor` (`@dnd-kit/react@0.1.21/index.d.ts:5`) — and no plugin among
 * them; all five live only on `@dnd-kit/dom`'s root (`index.d.ts:298`). It is a plain dependency of
 * `@dnd-kit/react` rather than a peer, and pnpm's isolated layout makes a transitive dependency
 * unresolvable from a package that has not declared it, so the declaration is what makes this import
 * work at all. It changes nothing about what a consumer pays: both are **optional** peers, this
 * module is reachable only through the `./dnd` subpath, and `@dnd-kit/dom` is already in every tree
 * that installed `@dnd-kit/react`.
 *
 * `Accessibility` is here for a reason of its own. It is **already running** in both kits today, by
 * the fallback above, and it is already writing English into the DOM: a
 * `role="status" aria-live="polite"` region on `document.body`, a hidden instructions node wired
 * onto each handle as `aria-describedby`, and sentences built from `source.id` — *"Picked up
 * draggable item 7."*, where `7` is a record id. Naming it here is what makes it configurable.
 *
 * ---
 *
 * **ANNOUNCEMENTS SEAM.** The text is not this file's to write. The library hands its callbacks
 * only `source.id` / `target.id`, and turning an id into "Price, column 3 of 9" needs the table and
 * the message catalogue — neither of which an adapter has, or should. So the grid builds the
 * sentences and the port carries them: `DndProviderProps` grows an announcement bag, and the change
 * here is to replace the bare class with
 * `Accessibility.configure({ announcements, screenReaderInstructions })` built from that bag.
 *
 * Three constraints come with that change, and they are why the seam is marked rather than guessed:
 *
 * - **It cannot stay at module scope.** A configured descriptor depends on props, so the array has
 *   to be built inside {@link DndProvider} — and then memoised on the bag's identity, because the
 *   provider **reassigns** `manager.plugins` whenever the array's identity changes (the same
 *   `useOnValueChange` that watches `sensors`), which re-instantiates every plugin in it, including
 *   in the middle of a gesture. A grid that hands over a fresh bag per render would rebuild the
 *   live region mid-drag; keeping the bag stable is the grid's half of the contract.
 * - **Do not pass an explicit `id`.** The description node and the live region are created per
 *   manager (`index.js:209-226`), so three grids on one page have three regions and each announces
 *   only its own drag. A fixed `id` would collide them, and the last grid to mount would win.
 * - **The callbacks are translated, not forwarded.** The library hands them its own events, so the
 *   adapter maps those to the port's vocabulary, derives whether the drag is a pointer or a keyboard
 *   one, and splits `dragend` into a drop and a cancellation.
 *
 * What does **not** need configuring is the handle's `aria-roledescription`: the plugin sets it, and
 * `role` / `tabindex` / `aria-describedby` with it, only when the attribute is absent
 * (`index.js:243-262`), so a handle that writes its own value keeps it. Its live
 * `aria-pressed` / `aria-grabbed` / `aria-disabled` reflection is unconditional and is one of the
 * reasons the plugin is configured rather than replaced.
 */
const DRAG_PLUGINS_BESIDE_ACCESSIBILITY = [AutoScroller, Cursor, Feedback, PreventSelection]

/**
 * The array as it is mounted when the grid passes no announcements: the plugin unconfigured, and the
 * other four kept. Module scope, so a grid without announcements never reassigns `manager.plugins`.
 */
const DRAG_PLUGINS = [Accessibility, ...DRAG_PLUGINS_BESIDE_ACCESSIBILITY]

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
		/** See {@link SortableDragStartEvent.operation.activatorEvent}. */
		activatorEvent?: Event | null
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
		/**
		 * The event that started the operation, which is how {@link toDragInput} tells a keyboard
		 * drag from a pointer one. `@dnd-kit/abstract@0.1.21` keeps it on the operation as
		 * `activatorEvent: Event | null`; optional here because nothing else in this file needs it and
		 * a version that stops exposing it should degrade to "pointer", not throw.
		 */
		activatorEvent?: Event | null
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
		/** See {@link SortableDragStartEvent.operation.activatorEvent}. */
		activatorEvent?: Event | null
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

/**
 * Whether this operation is being driven from the keyboard — the one fact an announcement needs and
 * the port's events do not carry, so it is derived here and handed over on {@link DndAnnouncement}.
 *
 * It decides whether anything is said at all: the grid narrates a keyboard drag, because that is a
 * sequence of discrete steps its user gets no visual feedback from, and stays silent on a pointer
 * drag, which the person making it can see and which would otherwise announce several times a
 * second. The adapter's job is to report it faithfully rather than to decide the policy.
 *
 * **Not `activatorEvent instanceof KeyboardEvent`.** That constructor is bound to one realm and
 * every docs example renders the grid inside an iframe — the same reason {@link ELEMENT_NODE_TYPE}
 * is a number rather than a read of `Node`. A keyboard event is the one carrying `key`, which is
 * true across realms and survives minification.
 *
 * Anything else, including a missing activator, reads as a pointer: the honest default is the one
 * that says nothing, so a version of the library that stops exposing the activator goes quiet rather
 * than narrating every mouse move.
 */
function toDragInput(operation: { activatorEvent?: Event | null }): DragInput {
	const { activatorEvent } = operation
	if (!activatorEvent) return DragInput.Pointer

	return typeof (activatorEvent as { key?: unknown }).key === 'string' ? DragInput.Keyboard : DragInput.Pointer
}

/**
 * The held item alone, as the port's {@link DndDragSourceEvent} — a pickup, or a cancellation.
 *
 * Neither moment has a target, which is the whole reason the port carries a third event shape: at
 * pickup nothing has been hovered yet, and a cancellation returns the item whence it came. Refuses
 * the same way {@link toDragOverEvent} does, and for the same reasons: a `type` this adapter did not
 * write, or an id it cannot read back, is not a drag it can describe.
 */
function toDragSourceEvent(event: SortableDragStartEvent): DndDragSourceEvent | null {
	const { source } = event.operation
	if (!source) return null

	const kind = fromDragKey(source.type)
	if (!kind) return null

	const sourceId = fromSortableId(source.id)
	if (sourceId === null) return null

	return { ...kind, sourceId }
}

/**
 * The grid's announcements, as the options `Accessibility` takes — the one place this file translates
 * between the library's vocabulary and the port's.
 *
 * Four translations, each refusing rather than guessing. The library hands its own events, so every
 * callback maps one to the port's shape, adds {@link toDragInput}, and returns `undefined` when there
 * is nothing honest to describe — which the plugin reads as "say nothing" exactly as the port does.
 *
 * **`dragend` is two events on the port and one here**, split on `canceled`: a cancellation is a
 * {@link DndDragSourceEvent}, because nothing landed anywhere, while a drop is the same
 * {@link DndDropEvent} `onDrop` receives.
 *
 * **These callbacks describe and commit nothing.** `resolveDrop` is a read of the operation's refs,
 * and {@link DndProvider}'s `onDragEnd` is the only place `onDrop` is ever called — on every path,
 * and inside the `trackRendering` -> `startTransition` that handler is wrapped in
 * (`@dnd-kit/react@0.1.21/index.js:58-68,141-146`). An earlier revision committed from here, so that
 * the sentence could be built against a table that had already moved the item. The grid no longer
 * reads the table to answer that — a drop's position is derived from a snapshot taken at pickup — so
 * the commit, and the per-operation idempotence that made it safe, bought nothing and are gone. Do
 * not reintroduce either.
 *
 * **What this does depend on is the order the two `dragend` listeners run in, and that is a
 * dependence to state rather than leave discovered.** The plugin's own listener is registered inside
 * `new DragDropManager(input)`, before `DragDropProvider` adds the one that calls `onDragEnd`
 * (`@dnd-kit/react@0.1.21/index.js:114-147`), so this callback runs *first* — while
 * `hoveredTargetId` / `startAnchor` / `endAnchor` still hold the operation, which the provider's
 * handler clears as soon as it has committed.
 *
 * **It is safe to depend on because inverting it costs a sentence and cannot produce a wrong one.**
 * Were a later version to register the provider's listener first, those refs would be cleared before
 * this callback read them, {@link toDropEvent} would refuse for want of an anchor, and the drop would
 * go unannounced — silence, which is what every other refusal in this file answers with, rather than
 * a sentence naming a position the item is not in. `dnd.test.tsx` drives that order and pins the
 * silence, so the degradation is measured rather than asserted.
 */
function toAccessibilityOptions(
	announcements: DndAnnouncements,
	resolveDrop: (event: SortableDragEndEvent) => DndDropEvent | null,
): {
	announcements: {
		dragstart: (event: SortableDragStartEvent) => string | undefined
		dragover: (event: SortableDragOverEvent) => string | undefined
		dragend: (event: SortableDragEndEvent) => string | undefined
	}
	screenReaderInstructions: { draggable: string }
} {
	return {
		announcements: {
			dragstart: (event) => {
				const source = toDragSourceEvent(event)

				return source ? announcements.dragStart({ ...source, input: toDragInput(event.operation) }) : undefined
			},
			dragover: (event) => {
				const over = toDragOverEvent(event)

				return over ? announcements.dragOver({ ...over, input: toDragInput(event.operation) }) : undefined
			},
			dragend: (event) => {
				const input = toDragInput(event.operation)

				if (event.canceled) {
					const source = toDragSourceEvent(event)

					return source ? announcements.dragCancel({ ...source, input }) : undefined
				}

				// Resolved, not committed — see this function's docblock. The grid's own gate keeps a
				// pointer drag silent, so there is no input test to make here.
				const drop = resolveDrop(event)

				return drop ? announcements.dragEnd({ ...drop, input }) : undefined
			},
		},
		// The plugin's own default is an English paragraph about the space bar and the arrow keys; this
		// is the same thing in the application's language, on the hidden node each handle points at
		// through `aria-describedby`.
		screenReaderInstructions: { draggable: announcements.instructions },
	}
}

function DndProvider({ onDrop, canDrop, announcements, children }: DndProviderProps) {
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

	/**
	 * This operation's drop as the refs above currently stand — a **read**, and the only call to
	 * {@link toDropEvent} in this file.
	 *
	 * Both `dragend` listeners reach it: the accessibility plugin's, to describe where the item
	 * landed, and the provider's own handler below, which is the one that then calls `onDrop`.
	 * Nothing here writes anything, so two callers cost one extra translation and change no
	 * outcome — which is why the per-operation idempotence an earlier revision needed went out with
	 * the commit it protected. {@link toAccessibilityOptions} has the ordering that replaced it.
	 *
	 * Stable for the life of the provider, closing over refs alone: the plugins array below is
	 * memoised on this function's identity, and reassigning `manager.plugins` re-instantiates every
	 * plugin in it.
	 */
	const resolveDrop = useCallback(
		(event: SortableDragEndEvent): DndDropEvent | null =>
			toDropEvent(event, {
				hoveredTargetId: hoveredTargetId.current,
				startAnchor: startAnchor.current,
				endAnchor: endAnchor.current,
			}),
		[],
	)

	/**
	 * The plugins, configured with this grid's announcements when it has any.
	 *
	 * **Memoised on the bag's identity, and that is a correctness requirement rather than an
	 * optimisation.** The provider reassigns `manager.plugins` whenever the array's identity changes
	 * (the same `useOnValueChange` that watches `sensors`), which re-instantiates every plugin in it —
	 * so a fresh array per render would tear down and rebuild the live region, the cursor and the drag
	 * feedback in the middle of the gesture using them. The grid's half of that contract is to keep
	 * the bag stable, which `GridDndProvider` does by memoising it.
	 *
	 * A grid that passes none gets {@link DRAG_PLUGINS}, a module constant, so the common path has no
	 * identity to change at all. Still no explicit `id`: the live region and the description node are
	 * created per manager, so three grids on a page have three regions, each announcing only its own.
	 */
	const plugins = useMemo(
		() =>
			announcements
				? [
						Accessibility.configure(toAccessibilityOptions(announcements, resolveDrop)),
						...DRAG_PLUGINS_BESIDE_ACCESSIBILITY,
					]
				: DRAG_PLUGINS,
		[announcements, resolveDrop],
	)

	return (
		<DragDropProvider
			sensors={DRAG_SENSORS}
			plugins={plugins}
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
				// The one commit, on every path and on this listener alone. An announcement callback may
				// have read the same refs a moment ago to describe this drop; it did not perform it.
				// Clearing comes after, which is what the ordering in `toAccessibilityOptions` rests on.
				const drop = resolveDrop(event as SortableDragEndEvent)
				if (drop) onDrop(drop)
				hoveredTargetId.current = null
				startAnchor.current = null
				endAnchor.current = null
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
