import { canDropColumn } from '@ez-kit/data-grid-core'

import { getRowDropIndex, getRowDropOrder } from '../utils/row-drop-order'
import { getVisibilityPanelColumns } from '../utils/visibility-panel-columns'
import { getVisualLeafColumns } from '../utils/visual-column-order'

import { DragAxis, DragInput, DragSurface } from './dnd'
import { COLUMN_DROP_SCOPE } from './dnd/column-drop-scope'
import { columnNameOf } from './visually-hidden'

import type { DataTable, GridFeatures } from '../types'
import type { DndAnnouncement, DndAnnouncements, DndDragOverEvent, DndDragSourceEvent, DndDropEvent } from './dnd'
import type { GridMessages, OrderingColumnContext, OrderingPositionContext } from '@ez-kit/data-grid-core'
import type { Column } from '@tanstack/table-core'

/** The `ordering` group of the resolved catalogue, read live on every announcement. */
type OrderingMessages = GridMessages['ordering']

/**
 * The two sentences one moment of a drag has — one per axis.
 *
 * A row and a column are announced by **different catalogue keys**, not by one key taking a name the
 * grid built: a row has no heading, only a place, so its sentence has to be able to say "row 3 of
 * 20" in its own word order. See `GridMessages.ordering` for the full argument.
 *
 * Picked from the catalogue **at announce time**, which is why this is a function of the group
 * rather than a pair of callbacks: the bag is built once and the dictionary above it can change
 * under it. See {@link buildDndAnnouncements}.
 */
type OrderingSentences = {
	row: (ctx: OrderingPositionContext) => string
	column: (ctx: OrderingColumnContext) => string
}

/**
 * Which list a row's announced position is counted in.
 *
 * {@link RowPositionSource.Window} is the drag's own index space: the window a virtualized body
 * published, falling back to what a plain body renders. That is the list a pickup and a move are
 * *about* — the user is stepping among the rows on screen, and those are the positions they can
 * verify.
 *
 * {@link RowPositionSource.Table} is the table's own order, read live. It serves the moment that
 * commits nothing: a **cancellation**, where the arrangement the sentence claims is the one the
 * table still holds.
 *
 * A **drop** uses neither — it is derived from {@link LandingSnapshot}, because no list read at drop
 * time answers the question. See {@link buildDndAnnouncements}.
 *
 * **The accepted cost is that a virtualized grid changes scale mid-gesture**: it narrates a window
 * position while the row is held and a position in the whole order once it lands. Both numbers are
 * the true answer to the question being asked at that moment, and the alternative — one scale
 * throughout — is wrong at one end or the other. Do not "simplify" the drop back onto the window.
 */
const RowPositionSource = {
	/** The drag's index space: the published window, or what the body renders. */
	Window: 'window',
	/** The table's own order, read live — the scale a cancellation is counted in. */
	Table: 'table',
} as const

type RowPositionSource = (typeof RowPositionSource)[keyof typeof RowPositionSource]

/** What every announcement carries, whichever event shape it wraps. */
type AnnouncedDrag = {
	axis: DragAxis
	surface: DragSurface
	input: DragInput
}

/**
 * Which id answers which half of a sentence — **they are not always the same id.**
 *
 * A sentence says *what* moved and *where it is*, and mid-drag those are two different items: the
 * thing that moved is the held one, while the slot it reached is the neighbour it is over. Naming
 * the neighbour was a defect — a drag of `Name` onto `Department` announced "Moved column Department
 * to position 3 of 5", i.e. the displaced column, which reads as though the wrong column had been
 * picked up. Rows were unaffected only because they are named by position alone.
 */
type SentenceSubject = {
	/** The item the sentence is **about** — always the held one. */
	nameId: string
	/** The item whose position the sentence reports. */
	positionId: string
}

/**
 * The list a **drop** is measured against: the order as it stood when the item was picked up, plus
 * the held column's name resolved at the same moment.
 *
 * Captured rather than read back, for the reason {@link buildDndAnnouncements} states in full — a
 * drop's landing position is *computed* from the move, and the only list the arithmetic is defined
 * against is the pre-commit one.
 *
 * Axis-discriminated because only one axis has a name to carry. A row is announced by its position
 * alone, so a `name` on that arm would be a field nothing reads and something would eventually fill
 * with a row id.
 */
type LandingSnapshot =
	| {
			axis: typeof DragAxis.Row
			/** Row ids in the order the body rendered them when the row was picked up. */
			ids: readonly string[]
	  }
	| {
			axis: typeof DragAxis.Column
			/** Column ids of the drag's surface, as that surface listed them at pickup. */
			ids: readonly string[]
			/** The held column's name, resolved at pickup by {@link columnNameOf}. */
			name: string
	  }

/**
 * Builds the sentences a drag is narrated with, from the table and the resolved message catalogue.
 *
 * **This is the layer that can say anything useful, which is why it is the layer that says it.** A
 * drag library's announcement callbacks receive the ids it is moving; a kit's adapter has the
 * callbacks and no table. Only here do the two meet, so here is where `"7"` becomes "Picked up row 3
 * of 20" and `"unit_price"` becomes "Picked up column Unit price, position 4 of 9".
 *
 * **Every argument is a reader, and the returned bag is built once.** Not a convenience: the drag
 * library's plugin registry reuses a plugin instance keyed by its constructor and only reassigns
 * `options`, while `@dnd-kit/dom@0.1.21`'s `Accessibility` reads `announcements` and
 * `screenReaderInstructions` **in its constructor alone** — so the first render's bag is the only one
 * that is ever consulted. A bag rebuilt per render would therefore not reach the live region at all,
 * and a locale switched after mount would keep announcing in the old language. The callbacks instead
 * reach for the current table and the current dictionary when they are invoked, which is the shape
 * `readRenderedRowIds` already had and for an adjacent reason: a virtualized body republishes its
 * window on every auto-scroll frame without the provider above it re-rendering.
 *
 * **{@link DndAnnouncements.instructions} is the one member that cannot be made live, and it is not
 * a defect in this function.** It is a string rather than a callback because a handle points
 * `aria-describedby` at it before any drag exists; the library builds its hidden text node from the
 * value captured in that same constructor and recreates the node only when it has been disconnected
 * from the document. So the instructions text is frozen at mount, a runtime locale change does not
 * reach it, and the only way to pick up a new one is to remount the grid. Said here and on the key
 * itself, because the other nine announcements *are* live and silence about the exception is what
 * turns a known limit into a bug report.
 *
 * Every callback may return `undefined`, which the port defines as "say nothing" — and this returns
 * it in four cases: a pointer drag, a self-hover, an id that is in no list the drag counts in (a row
 * that scrolled out of a virtual window, say), and a drop whose pickup was never announced. None of
 * the four has a sentence worth interrupting a user for.
 */
export function buildDndAnnouncements<TRow extends object>(
	readTable: () => DataTable<GridFeatures, TRow>,
	readMessages: () => GridMessages,
	readRenderedRowIds: () => readonly string[] | null,
): DndAnnouncements {
	/**
	 * The gesture in flight, or `null` between gestures — the one piece of mutable state here.
	 *
	 * A cell rather than an argument because the two moments that need it are two separate
	 * callbacks: the list is only knowable at pickup and is only needed at the drop. One drag is in
	 * flight at a time per grid, and the bag is per grid, so a single cell is the whole model.
	 */
	let held: LandingSnapshot | null = null

	/**
	 * The columns one surface lists, which is the list positions on the column axis are counted in.
	 *
	 * The two surfaces count in two different lists: the header arranges the visible leaves by pin
	 * band, the visibility panel lists every leaf including the hidden. Announcing "position 4 of 9"
	 * from the wrong one would name a place the user cannot find.
	 */
	const surfaceColumns = (surface: DragSurface): Column<GridFeatures, TRow>[] =>
		surface === DragSurface.Panel ? getVisibilityPanelColumns(readTable()) : getVisualLeafColumns(readTable())

	/**
	 * Where a row sits, 1-based — or `null` if it sits in the named list nowhere.
	 *
	 * On the {@link RowPositionSource.Window} path the index comes from `getRowDropIndex`,
	 * deliberately: it is the **same** function the rows themselves register their positions through,
	 * so a held row's announced place is a place in the list the drag is actually moving it among.
	 * That derivation runs twice when nothing is published, once for the index and once for the
	 * total; left that way, because a keyboard drag announces a handful of times per gesture and
	 * collapsing it would mean a second copy of the index lookup, which is exactly the second reader
	 * `getRowDropOrder`'s docblock warns about.
	 */
	const rowContext = (rowId: string, source: RowPositionSource): OrderingPositionContext | null => {
		const table = readTable()

		if (source === RowPositionSource.Table) {
			const rows = getRowDropOrder(table)
			const position = rows.findIndex((candidate) => candidate.id === rowId)

			return position < 0 ? null : { position: position + 1, total: rows.length }
		}

		const published = readRenderedRowIds()
		const position = getRowDropIndex(table, published, rowId)
		if (position < 0) return null

		return { position: position + 1, total: published?.length ?? getRowDropOrder(table).length }
	}

	/**
	 * A column's name and 1-based place among the columns of its **surface** — or `null` if either id
	 * is on neither. One list serves both ids: they are columns of the same surface.
	 *
	 * **The name falls back to the column id, and is never a rendered header.** `header` may be
	 * arbitrary JSX, and flattening an element to text means rendering it outside the tree — so a
	 * column headed by an element is announced by its id, which is a worse name and an honest one.
	 * `columnNameOf` is the same fallback every other control under a header already uses.
	 */
	const columnContext = (surface: DragSurface, subject: SentenceSubject): OrderingColumnContext | null => {
		const columns = surfaceColumns(surface)
		const named = columns.find((candidate) => candidate.id === subject.nameId)
		const position = columns.findIndex((candidate) => candidate.id === subject.positionId)
		if (!named || position < 0) return null

		return {
			name: columnNameOf(named.columnDef.header, subject.nameId),
			position: position + 1,
			total: columns.length,
		}
	}

	/**
	 * One sentence, or silence.
	 *
	 * **The keyboard gate is here rather than at each call site** so no later moment can forget it.
	 * A pointer drag is visible to the person making it and a mouse crosses a neighbour several times
	 * a second; narrating that drowns out everything else on the page. `DragInput` has the reasoning.
	 */
	const sentence = (
		event: AnnouncedDrag,
		subject: SentenceSubject,
		rowSource: RowPositionSource,
		pick: (ordering: OrderingMessages) => OrderingSentences,
	): string | undefined => {
		if (event.input !== DragInput.Keyboard) return undefined
		const sentences = pick(readMessages().ordering)

		switch (event.axis) {
			case DragAxis.Row: {
				// No name: a row is announced by its position alone, so `nameId` has nothing to answer.
				const ctx = rowContext(subject.positionId, rowSource)

				return ctx ? sentences.row(ctx) : undefined
			}
			case DragAxis.Column: {
				const ctx = columnContext(event.surface, subject)

				return ctx ? sentences.column(ctx) : undefined
			}
		}
	}

	/**
	 * Record the list the drop will be measured against. Called at pickup, keyboard drags only —
	 * a pointer drag announces nothing, so capturing a list for one would be work nobody reads.
	 */
	const capture = (event: AnnouncedDrag, sourceId: string): void => {
		if (event.input !== DragInput.Keyboard) return

		switch (event.axis) {
			case DragAxis.Row: {
				held = { axis: DragAxis.Row, ids: getRowDropOrder(readTable()).map((row) => row.id) }
				return
			}
			case DragAxis.Column: {
				const columns = surfaceColumns(event.surface)
				const named = columns.find((candidate) => candidate.id === sourceId)
				held = named
					? {
							axis: DragAxis.Column,
							ids: columns.map((column) => column.id),
							name: columnNameOf(named.columnDef.header, sourceId),
						}
					: null
				return
			}
		}
	}

	/**
	 * Whether the core will actually perform this drop — asked again, at the drop, before anything is
	 * said about where the item landed.
	 *
	 * The same two predicates `GridDndProvider` gates the *hover* with, and asking them twice is not
	 * redundant: the gate ran on an earlier frame, so a table that changed in between — a sort
	 * arriving, data replaced, the row filtered out, a column hidden — can refuse at release what it
	 * allowed while the item was held. A derived sentence has no way to notice that on its own, which
	 * is exactly why it is asked here rather than assumed.
	 *
	 * Legality, not outcome: it answers "may this pair move" and stays true once the move has been
	 * made, so it reads the same whether the adapter announces before or after the commit.
	 */
	const willCommit = (event: DndAnnouncement<DndDropEvent>): boolean => {
		const table = readTable()

		switch (event.axis) {
			case DragAxis.Row:
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
				return table.ordering?.canDropRow?.(event.sourceId, event.targetId) ?? false
			case DragAxis.Column:
				return canDropColumn(table, event.sourceId, event.targetId, COLUMN_DROP_SCOPE[event.surface])
		}
	}

	/**
	 * Where the dropped item landed — **computed from the move, deliberately, and never observed.**
	 *
	 * The obvious implementation reads the item's position back out of the grid once the drop has
	 * been committed, and it is wrong in every grid rather than in an exotic one. A commit is a React
	 * state update: in an **uncontrolled** grid it is queued and nothing has re-rendered by the time
	 * this runs, and in a **controlled** one it leaves through `onChange` for a consumer that may
	 * re-render on its own schedule, or asynchronously, or not at all. So the list read here is the
	 * list as it stood *before* the drop, and the position read off it is the one the item started
	 * from. Measured in the browser on the uncontrolled path: a row committed third was announced as
	 * "Dropped the row at position 2 of 8", deterministically.
	 *
	 * Nothing about the ordering of adapter and commit fixes that, which is why the fix is not a
	 * stricter rule for adapters: there is no moment an announcement callback could run at and
	 * observe the result, because the result does not exist yet in the only tick available.
	 *
	 * The derivation needs no re-render. A drop names its source and its target, and both axes commit
	 * the same arithmetic — `dropColumn` and `applyRowMove` splice the source out and back in at the
	 * target's index **in the list as it stood before the splice** — so the source's landing index in
	 * that list is exactly the target's index in it. That is the snapshot taken at pickup, which no
	 * commit has touched because nothing commits mid-drag. The wording the position lands in therefore
	 * assumes the drop was honoured; a drop the grid refuses is normally unreachable, since `canDrop`
	 * declines the illegal step long before a release (see `DndProviderProps.canDrop`).
	 *
	 * **A drop the core refuses is announced as silence**, which is what {@link willCommit} is for: a
	 * derived sentence describes what the drag *intended*, so without that gate a refused move would
	 * be narrated as a confident landing nothing moved to. The old state read was accidentally safer
	 * there — it reported the original position — so the gate is what makes deriving strictly better
	 * rather than better on average.
	 *
	 * **One refusal it cannot see, and the trade is deliberate.** In a controlled grid the move leaves
	 * through `onChange`, which is fire-and-forget: a consumer that discards it, or defers it and then
	 * drops it, leaves nothing for this layer to read and nothing for the gate to refuse, so the
	 * sentence names the intended landing while the rows stay put. So what is announced is the move
	 * the grid **performed**, and in controlled mode "performed" means "reported to the consumer".
	 * That misreports exactly one kind of grid — one that asks to own the order and then does not
	 * apply it — while being right about every grid that does apply it, where the old state read was
	 * wrong about all of them. `dnd-announcements.test.tsx` drives that shape directly, with an
	 * `onChange` that returns without changing anything.
	 *
	 * **Do not "simplify" this back into a state read.** A refactor that looks like a tidy-up —
	 * `rowContext(sourceId, RowPositionSource.Table)` is one line and reads beautifully — reinstates
	 * the defect silently, in a sentence nobody sighted ever hears.
	 */
	const landing = (event: DndAnnouncement<DndDropEvent>): string | undefined => {
		const snapshot = held
		held = null
		if (event.input !== DragInput.Keyboard || !snapshot) return undefined
		if (!willCommit(event)) return undefined
		// A pickup on one axis cannot reach a drop on the other, so this is a guard rather than a
		// branch — but it is what keeps the wording and the list it measured in the same axis.
		if (snapshot.axis !== event.axis) return undefined

		const position = snapshot.ids.indexOf(event.targetId)
		if (position < 0) return undefined

		const ordering = readMessages().ordering
		const place = { position: position + 1, total: snapshot.ids.length }

		return snapshot.axis === DragAxis.Row
			? ordering.rowDropped(place)
			: ordering.columnDropped({ name: snapshot.name, ...place })
	}

	return {
		/*
		 * Read once, and frozen from here on — the library captures it in a constructor and builds its
		 * hidden node from that copy. See this function's docblock; the limit is stated on
		 * `messages.ordering.instructions` too.
		 */
		instructions: readMessages().ordering.instructions,
		// Nothing has moved yet, so both halves are the held item, counted in the drag's own space.
		dragStart: (event: DndAnnouncement<DndDragSourceEvent>) => {
			capture(event, event.sourceId)

			return sentence(event, { nameId: event.sourceId, positionId: event.sourceId }, RowPositionSource.Window, (o) => ({
				row: o.rowPickedUp,
				column: o.columnPickedUp,
			}))
		},
		/*
		 * Named by the **source** and positioned by the **target**: the sentence is about the item the
		 * user is holding, and the slot it has reached is the neighbour's, since nothing is committed
		 * mid-drag and the target's own position is where a release here would put the source.
		 *
		 * A self-hover says nothing. It is the normal state once a sortable has displaced its first
		 * neighbour — the source occupies its destination and the collision resolves to it — so it
		 * means "no new neighbour", and the position it would report is the source's original one.
		 */
		dragOver: (event: DndAnnouncement<DndDragOverEvent>) =>
			event.sourceId === event.targetId
				? undefined
				: sentence(event, { nameId: event.sourceId, positionId: event.targetId }, RowPositionSource.Window, (o) => ({
						row: o.rowMovedTo,
						column: o.columnMovedTo,
					})),
		dragEnd: landing,
		/*
		 * The source on both halves, and the table read **live** — nothing was committed by
		 * construction, since a cancelled drag fires no `onDrop`, so the table still holds the
		 * arrangement the item started in, which is exactly what the sentence claims. Clearing the
		 * snapshot is what keeps a cancelled gesture from being measured by the next drop.
		 */
		dragCancel: (event: DndAnnouncement<DndDragSourceEvent>) => {
			held = null

			return sentence(event, { nameId: event.sourceId, positionId: event.sourceId }, RowPositionSource.Table, (o) => ({
				row: o.rowCancelled,
				column: o.columnCancelled,
			}))
		},
	}
}
