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
 * Do not add a `'panel'` member for it: the surface it differs on is {@link DragSurface}, a
 * separate closed set, precisely so the axis keeps naming the slice a drop writes.
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

/**
 * Which **surface** an item is dragged on — the second half of what partitions a drag.
 *
 * Not a third axis, and the reason is the one {@link DragAxis} already states: the column panel
 * reorders columns, writes the same `columnOrder` slice the header does, and differs only in
 * *scope*. What it does not share is the **index space**. The header registers the visible leaf
 * columns (`ColumnMoveScope.Visible`); the panel registers every listed leaf column, hidden ones
 * included (`ColumnMoveScope.All`). Those two lists have different lengths and different
 * positions, so an item from each cannot sit in one dense `0..n-1` run — and density is not
 * negotiable: see {@link DragSpec.index} for the measurement, and note the failure is silent.
 *
 * So one axis, two surfaces, and an adapter partitions its library's index space by **both**. Two
 * closed sets of literals rather than one set of three values, because the axis decides which
 * slice a drop writes and the surface decides which list an index counts in — a drop arriving
 * from the panel is committed against `columnOrder` exactly as a header drop is, with the other
 * scope.
 *
 * This is **not** the composite `group` key the PRD removed in r3. That one encoded a column's pin
 * band and its `parentId` — facts about *data*, needing an injective encoding because ids may
 * contain any character — in order to enforce boundaries mid-drag. Boundaries are still refused by
 * the core drop helpers and by `canDrop`. This carries two closed sets of literals and nothing a
 * caller supplies.
 */
export const DragSurface = {
	/** The grid's own table: rows in the body, header cells in the header. */
	Table: 'table',
	/** The column visibility panel, which lists hidden columns too. */
	Panel: 'panel',
} as const

export type DragSurface = (typeof DragSurface)[keyof typeof DragSurface]

/** What one draggable item tells the adapter about itself. */
export type DragSpec = {
	/** The row id or column id. The same identifier the core drop helpers take. */
	id: string
	/**
	 * The item's index in the list its axis *and surface* **renders** — counted from zero, over that
	 * list and no other.
	 *
	 * Stated this way because the obvious readings are wrong in both directions, and this docblock
	 * used to carry one of them ("the real index in its axis' order — never a position in a rendered
	 * window"). It is not an item's place in the underlying model: TanStack's `row.index` counts a
	 * row among its *parent's* children, which coincides with a rendered position only on page one of
	 * a flat, unfiltered grid. And in a **virtualized** body it is not a place in the whole order
	 * either — there the index *is* a position within the rendered window. That body declares the
	 * rows it renders (the window, plus the row it holds mounted for the length of a drag) and each
	 * row takes its index from the declaration. A row reporting its place in the whole model is
	 * exactly how the virtual case failed: the zeroth sortable of a window starting at row 5 claimed
	 * index `5`, and the plugin named below returned on the first frame.
	 *
	 * **Nothing reads this back.** A drop is reported as an id ({@link DndDropEvent}), so the
	 * declaration has exactly one reader and no second list has to agree with it — which is why a
	 * window that moves mid-drag is no longer a hazard on the commit side, only on this one.
	 *
	 * **And the indices of one axis *and surface* must be dense: exactly `0..n-1`, no gap and no
	 * duplicate.**
	 * That is a requirement of the library behind the adapter rather than of this port, but it is
	 * recorded here because a caller has no other way to learn it and the failure is silent.
	 * The pair is what an adapter partitions its library's index space by — see {@link
	 * DragSurface} for why the axis alone is not enough.
	 * Measured in `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`: it sorts each group's
	 * registered items by index and then asserts the i-th has `index === i`, bailing out entirely
	 * otherwise — which costs the visual displacement **and** the commit, since the item's index is
	 * then never updated and the adapter sees no movement to report. So an item that cannot be
	 * dragged is registered `disabled` at its real index, never left out.
	 */
	index: number
	/** Which order this item belongs to. Items of different axes never collide. */
	axis: DragAxis
	/**
	 * Which surface this item is rendered on — see {@link DragSurface}.
	 *
	 * Required rather than defaulted to {@link DragSurface.Table}: the field exists because two
	 * surfaces of one axis keep **separate index spaces**, and a default would let a new surface
	 * silently join an existing one's — which breaks its density and kills the drag for both, with
	 * no error anywhere. A caller that has to name it is a caller that had to think about it.
	 */
	surface: DragSurface
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
	 * `{ id, index, axis, surface, ...(disabled !== undefined ? { disabled } : {}) }`.
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
 * A completed drop, as the adapter reports it: **two ids, and no position anywhere.**
 *
 * This revision replaced a `targetIndex: number`, and the reason is worth stating in full, because
 * the index form reads like the safer answer and is not one.
 *
 * **An index is only meaningful while the list it counts in holds still, and a virtualized body's
 * does not.** There the index space is the rendered window (see {@link DragSpec.index}), and a
 * drag's own auto-scroll changes it mid-gesture — rows unmount, rows mount, and every survivor is
 * renumbered — so the same number denotes a different row from frame to frame. Instrumented on a
 * 10 000-row grid, dragging one row far down with the library's auto-scroll: across three runs the
 * index the drop carried was consistently 3–4 higher than the row the pointer was actually over,
 * because the library's space had grown by however many rows had scrolled past, and the grid
 * committed a row three or four places beyond the one the user released on. The **id** was right
 * in all three. That is not a tuning problem; the drift is unbounded in the length of the scroll.
 *
 * **The adapter is also the only side that can source the id honestly, which is why this is not
 * simply a read of the library's drop target — that value is unsound in two opposite ways, in two
 * frames of one gesture.** Measured against `@dnd-kit/dom@0.1.21`:
 *
 * - *A displacement that succeeded* ends with `manager.actions.setDropTarget(source.id)`
 *   (`sortable.js:418`), and nothing takes the target off the source afterwards, because
 *   `CollisionObserver.computeCollisions` does not skip the source's own droppable
 *   (`@dnd-kit/abstract@0.1.21/index.js:394-412`) and the source element follows the pointer. So the
 *   reported target **is** the dragged item, every time, and reading it would be a self-drop.
 * - *A displacement that bailed* leaves the target as the row the pointer is genuinely over. The
 *   plugin's move is a microtask chain (`sortable.js:373-418`) that returns early when a group's
 *   indices are not dense or a registered sortable has gone — which a virtualized body's auto-scroll
 *   causes continuously. There the **id is right** and the indices are the stale ones.
 *
 * Neither frame's signal is sound alone, and the pair is why: an index is wrong exactly where the id
 * is right, and the id is degenerate exactly where the index is fine. So the honest id is the last
 * target the pointer was over that the grid *allowed*, which an adapter already computes every frame
 * to answer {@link DndProviderProps.canDrop}; it remembers that and reports it here. Each in-repo
 * adapter's `toDropEvent` carries the mechanism, the citations, and one known caveat about the
 * no-movement check it still makes with indices of its own.
 *
 * So positions stay where they are meaningful — inside the drag library, which is the only thing
 * that needs them, and on {@link DragSpec.index}, which is how an item registers one. **Nothing
 * crosses this boundary but ids**, which is also the currency at the core boundary beneath it:
 * `dropRow` and `dropColumn` take two ids and resolve them against the table's own model, so no
 * second list has to agree with a first.
 */
export type DndDropEvent = {
	axis: DragAxis
	/**
	 * The surface the drop happened on, which is what decides the `ColumnMoveScope` the commit uses.
	 *
	 * It no longer decides a list to count an index in — there is no index — but it is still load
	 * bearing: a header drop is judged among the visible columns and a panel drop among every
	 * listed one, including the hidden.
	 */
	surface: DragSurface
	/** The item that was picked up. */
	sourceId: string
	/**
	 * The item it should land on: whatever the pointer was legally over when the drag was released.
	 *
	 * Never the source itself — an adapter that cannot name a target other than the source reports
	 * no drop at all, since that is the degenerate reading described above rather than a drop onto
	 * oneself. The grid guards it anyway, and the core helpers refuse it a third time.
	 */
	targetId: string
}

/**
 * A **prospective** drop: the item is still held, and the pointer is over `targetId`.
 *
 * Both ends are ids, as on {@link DndDropEvent} — the whole port speaks ids. This one is asked
 * *before* the displacement that makes the library's own target degenerate, so its target is simply
 * the item under the pointer, and it is the id a correct adapter remembers in order to report the
 * drop. Same currency the core `canDrop*` helpers take.
 */
export type DndDragOverEvent = {
	axis: DragAxis
	/** The surface both ends are on. Two surfaces never collide, so one field covers both. */
	surface: DragSurface
	/** The item being held. */
	sourceId: string
	/**
	 * The item the pointer is over.
	 *
	 * It **may** be the source itself, and usually is once a displacement has happened: the source
	 * then occupies its destination and the collision resolves to it. An adapter is welcome to
	 * filter that case out, and both in-repo ones do, but it is not obliged to — the grid answers
	 * `true` for a self-hover, because a refusal there would stop every legal step after the first.
	 */
	targetId: string
}

/**
 * How a drag was driven — which is **the one fact an announcement needs and the port did not
 * carry**, so it arrives here rather than being widened onto the events above.
 *
 * A live region exists for a gesture its user cannot see. A pointer drag is visible to the person
 * making it, and a mouse crosses a new neighbour several times a second, so narrating one is noise
 * that drowns out everything else the page announces; a keyboard drag is a sequence of discrete
 * steps with no visual feedback a screen-reader user receives, and is the whole reason the region is
 * there. So the grid announces the keyboard path and stays silent on the pointer one — which it can
 * only do if it is told which it is looking at.
 *
 * Deliberately **not** added to {@link DndDragOverEvent} or {@link DndDropEvent}: `canDrop` and
 * `onDrop` answer the same question whichever device asked it, and a field neither of them reads
 * would be one more thing an adapter has to populate correctly for nothing. It is instead a member
 * of {@link DndAnnouncement}, which is the only place it is consumed.
 *
 * Both values are derivable by an adapter without the port learning anything new — a drag library
 * either exposes the activating event (`@dnd-kit/abstract@0.1.21` keeps
 * `DragOperation.activatorEvent`) or names the sensor that started the operation. **How** an adapter
 * gets from one of those to this classification is its own business, and this port deliberately
 * prescribes nothing: what it asks for is the answer, not a technique for arriving at it.
 *
 * One technique in particular is **not** prescribed, because both in-repo adapters refuse it on good
 * grounds: `event instanceof KeyboardEvent` tests identity against the *realm's* constructor, so it
 * answers `false` for an event minted in another document — and every docs example renders the grid
 * inside an iframe. Those adapters read the event's own `key` instead, which is true across realms;
 * see `toDragInput` in either kit's `dnd.tsx`.
 */
export const DragInput = {
	/** A mouse, a pen or a touch — a gesture its own user can see. */
	Pointer: 'pointer',
	/** The keyboard: discrete steps, and the reason the live region exists. */
	Keyboard: 'keyboard',
} as const

export type DragInput = (typeof DragInput)[keyof typeof DragInput]

/**
 * A drag seen **from the held item alone** — a pickup, or a cancellation.
 *
 * The one shape the port was missing, and the minimum it was missing by. Neither moment has a
 * target: at pickup nothing has been hovered yet, and a cancellation returns the item whence it came
 * rather than landing it anywhere, so a `targetId` would have nothing honest to put in it. Same
 * currency as every other event here — the axis, the surface and one id.
 *
 * One type for both moments rather than two identical ones: they differ in when they happen, not in
 * what they carry, and the bag's two members already say which is which.
 */
export type DndDragSourceEvent = {
	axis: DragAxis
	/** The surface the item is on. */
	surface: DragSurface
	/** The item picked up, or the item whose drag was cancelled. */
	sourceId: string
}

/**
 * One of the port's events, as an **announcement** sees it: the event plus how the drag is driven.
 *
 * A wrapper rather than a field on each event, so {@link DndDropEvent} and {@link DndDragOverEvent}
 * stay exactly what `onDrop` and `canDrop` are documented to receive — see {@link DragInput}.
 */
export type DndAnnouncement<TEvent> = TEvent & {
	/** Pointer or keyboard. */
	input: DragInput
}

/**
 * The sentences a drag should be narrated with, built by the grid and spoken by the adapter.
 *
 * **Why the grid builds them.** A drag library's own announcement callbacks receive the ids it is
 * moving and nothing else, so the best sentence they can produce names a record id — *"Picked up
 * draggable item 7."* Turning that into something a user can follow needs the column's heading, the
 * position among the rows on screen and the message catalogue, none of which a kit's adapter has or
 * should: it exists to not know about tables. So the grid builds whole sentences and the adapter
 * hands them to whatever its library announces through.
 *
 * **A callback may return `undefined`, and that means "say nothing".** It is how the grid declines to
 * narrate a pointer drag (see {@link DragInput}), and an adapter must treat it as silence rather
 * than printing it — `@dnd-kit/dom@0.1.21`'s live region already skips a falsy value, so forwarding
 * the return value straight through is correct there.
 *
 * {@link instructions} is a constant rather than a callback because it is read before any drag
 * exists: it is the text a handle points `aria-describedby` at. It is also the one member a running
 * app cannot change — `@dnd-kit/dom@0.1.21`'s plugin captures it once and builds its hidden node from
 * that copy, so a dictionary swapped at runtime reaches every callback below and not this. The
 * catalogue key says so too.
 *
 * **The four callbacks are a sequence, not four independent questions.** {@link dragEnd} describes
 * where the item landed, which is *computed* from the list as it stood at pickup — so an adapter that
 * forwards the drop without having forwarded the pickup gets silence rather than a wrong number.
 * Forward all four.
 */
export type DndAnnouncements = {
	/** How to drive a drag from the keyboard, for the hidden element a handle describes itself by. */
	instructions: string
	/** The item has been picked up. Also what the grid measures {@link dragEnd} against. */
	dragStart: (event: DndAnnouncement<DndDragSourceEvent>) => string | undefined
	/** The held item is over a new neighbour. Called as often as that changes. */
	dragOver: (event: DndAnnouncement<DndDragOverEvent>) => string | undefined
	/**
	 * The item was dropped. The same event {@link DndProviderProps.onDrop} is given.
	 *
	 * **It may be called before or after the commit — the sentence does not read the result back.**
	 * See `buildDndAnnouncements`: the landing position is derived from the move, because no state
	 * read at this moment can answer it in a controlled grid.
	 */
	dragEnd: (event: DndAnnouncement<DndDropEvent>) => string | undefined
	/** The drag was abandoned and nothing was committed. */
	dragCancel: (event: DndAnnouncement<DndDragSourceEvent>) => string | undefined
}

/**
 * What a grid hands its adapter's provider.
 */
export type DndProviderProps = {
	/**
	 * Called once per completed drop, never during one.
	 *
	 * A drop the grid cannot honour still arrives here and is refused by the core drop helpers,
	 * which remain the place boundaries are enforced. {@link DndProviderProps.canDrop} exists so
	 * that refusal is normally unreachable, not so it can be skipped.
	 */
	onDrop: (event: DndDropEvent) => void
	/**
	 * Whether the held item may land on the item it is currently over. Called while the drag is in
	 * flight, as often as the pointer changes target.
	 *
	 * **An adapter that ignores this is incorrect, not merely less helpful.** A drag library with
	 * optimistic sorting displaces the neighbours *and reassigns its own indices* as the pointer
	 * moves; if the grid then declines the drop at release, nothing in React state changed, so no
	 * re-render pushes those indices back — the library's index space and the grid's disagree from
	 * then on, the header or body is left visibly permuted, and the next drag on that axis commits
	 * nothing. Measured, in `@dnd-kit/dom@0.1.21`: its `dragend` restore path runs only for a
	 * **cancelled** operation, and a refused drop is not a cancelled one.
	 *
	 * So the refusal has to happen before the displacement rather than after it, which is what this
	 * predicate is for. The same question `onDrop`'s commit asks, asked earlier — an adapter passes
	 * the answer to whatever its library offers for rejecting a hover.
	 *
	 * Returning `false` does not end the drag. The item stays where it legally got to, and a release
	 * there commits that position; it is only the illegal step that does not happen.
	 */
	canDrop: (event: DndDragOverEvent) => boolean
	/**
	 * The held item has just been displaced onto `targetId` — called for a hover {@link canDrop}
	 * **allowed**, at the moment the adapter lets its library displace for it, and never for a refused
	 * one or for the source hovering itself.
	 *
	 * **Not a commit, and nothing in the table changes.** {@link onDrop} stays the only commit; neither
	 * `ordering` nor `onOrderChange` moves mid-gesture. What this feeds is the arrangement a
	 * **virtualized** body renders while the pointer is down: that body re-renders on every frame of a
	 * drag's auto-scroll, and in model order it would put the held row back at its old place while the
	 * library has moved its element — and its index — to where the pointer took it. The two orders then
	 * disagree about one row, the library's index space has a gap and a duplicate, and its optimistic
	 * sorting bails on every hover after that: the neighbours stop moving for the rest of the gesture,
	 * though the drop still lands. Measured on a 10 000-row grid, after an auto-scroll of ~40 rows. With
	 * this, the body renders the **projected** order — the model with the held row moved to where the
	 * drag displaced it — so React's order and the library's are one order, and the space stays dense
	 * through any number of window turnovers.
	 *
	 * The same event {@link canDrop} was just asked about, so an adapter calls it with what it already
	 * has, after the gate. Displacement is a step from the arrangement as it stands, not a function of
	 * the model, so the grid needs **every** allowed displacement, in order — an adapter that forwards
	 * only some of them leaves the grid's arrangement and its library's apart.
	 *
	 * **Optional, and an adapter that ignores it stays correct where it was correct before** — every
	 * commit is by id, so nothing wrong is ever committed. What it costs is the defect above: in a
	 * virtualized body the neighbours stop moving once the window has turned over under the drag. A
	 * non-virtualized body does not read it.
	 */
	onDisplace?: (event: DndDragOverEvent) => void
	/**
	 * What to say about this drag, in the application's language — see {@link DndAnnouncements}.
	 *
	 * **Optional, and an adapter that ignores it is still correct — merely silent.** Unlike
	 * {@link canDrop}, nothing about the grid's state depends on this: a drag that is never announced
	 * commits exactly what an announced one commits. So an existing adapter keeps compiling and keeps
	 * working, and the cost of not forwarding it is paid entirely by screen-reader users, who hear
	 * whatever the drag library says on its own behalf.
	 *
	 * Worth knowing what that is, because it is not silence. `@dnd-kit/dom`'s default preset includes
	 * an `Accessibility` plugin that creates its own live region and announces into it — in English
	 * whatever the app's locale, naming record ids rather than columns and positions. An adapter
	 * built on that library has a third option beyond forwarding and ignoring, and it is the worst
	 * one: leaving the default in place while the rest of the grid speaks another language.
	 *
	 * Optional in the `exactOptionalPropertyTypes` sense, so the grid passes it with the conditional
	 * spread this package uses throughout rather than passing `undefined`.
	 */
	announcements?: DndAnnouncements
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
	 */
	Provider: ComponentType<DndProviderProps>
	/** Registers one item. A hook — same call order every render, like any other. */
	useSortableItem: (spec: DragSpec) => SortableItemHandle
}
