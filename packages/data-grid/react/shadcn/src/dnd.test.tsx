import { Accessibility, AutoScroller, Cursor, defaultPreset, Feedback, PreventSelection } from '@dnd-kit/dom'
import { KeyboardSensor, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	adapter,
	AnchorSide,
	dragActivationConstraints,
	hasTravelled,
	toDragAnchor,
	toDragOverEvent,
	toDropEvent,
} from './dnd'

import type {
	DragActivationEvent,
	DragAnchor,
	SortableDragEndEvent,
	SortableDragOverEvent,
	SortableDragStartEvent,
	SortableManager,
} from './dnd'
import type * as DndKitModule from '@dnd-kit/react'
import type * as SortableModule from '@dnd-kit/react/sortable'
import type { DndAnnouncements, DndDragOverEvent, DndDropEvent, SortableItemHandle } from '@ez-kit/data-grid-react'

/**
 * The handlers the adapter hands dnd-kit's provider, as this file drives them.
 *
 * Declared structurally, and reached by a cast, for the reason the adapter's own `SortableDragEndEvent`
 * is: the library's handler types are generic over four parameters whose arguments live in
 * `@dnd-kit/abstract`, a transitive dependency this package does not declare. The adapter casts in the
 * same direction at the same boundary.
 */
/** A manager as an allowed hover reads it: the registry, plus the promise a render settles. */
type RenderingManager = SortableManager & { renderer: { rendering: Promise<void> } }

type CapturedHandlers = {
	onDragStart?: (event: SortableDragEndEvent, manager: SortableManager) => void
	/**
	 * With the manager's `renderer` too: an allowed hover waits on `renderer.rendering` to take the end
	 * anchor again once the grid's displacement has rendered — see `rendered` below.
	 */
	onDragOver?: (event: SortableDragOverEvent, manager: RenderingManager) => void
	/**
	 * The manager is **optional**, and that is the point of the last case below: the adapter no longer
	 * reads a group's order at release, so a case can hand it the stale one a re-render leaves behind
	 * and assert that it changes nothing.
	 */
	onDragEnd?: (event: SortableDragEndEvent, manager?: SortableManager) => void
	/**
	 * The sensor list, as `unknown` members: a configured sensor is a `PluginDescriptor` out of
	 * `@dnd-kit/abstract`, and the cases below narrow what they need rather than naming that package.
	 */
	sensors?: readonly unknown[]
	/** The plugin list, as `unknown` members, for the reason the sensors are. */
	plugins?: readonly unknown[]
}

/**
 * Why the drop translation is tested through a named helper rather than by driving a drag.
 *
 * dnd-kit measures layout to decide anything, and jsdom reports every element as zero-sized — so a
 * simulated pointer drag here would exercise the measuring, not the mapping, and would be a test of
 * jsdom's geometry stub. Driving a real drag is Playwright's job once a handle exists (phase 4).
 * What *can* be tested without a browser is the half where the refusals live, and that is why
 * `toDropEvent` is an exported function instead of a closure inside the provider.
 */

/*
 * The hook is spied on, not replaced: the real implementation still runs, so the handle a case
 * reads comes from a real sortable, while the two mapping cases can read the input the adapter
 * built. Nothing else in this package can see that input — it is the adapter's only real decision,
 * and without this it would be asserted nowhere.
 */
vi.mock('@dnd-kit/react/sortable', async (importOriginal) => {
	const actual = await importOriginal<typeof SortableModule>()

	return { ...actual, useSortable: vi.fn(actual.useSortable) }
})

/*
 * The provider is wrapped, not replaced: the real one still mounts, so `renderItem` keeps getting a
 * real sortable, while a case can reach the handlers the adapter passed down. Those handlers are the
 * only place the remembered hover lives, and without this it would be asserted nowhere.
 *
 * `createElement` rather than calling the real component inline — it has hooks of its own, and they
 * belong to its own fiber.
 */
const capture: { current: CapturedHandlers | null } = { current: null }

vi.mock('@dnd-kit/react', async (importOriginal) => {
	const actual = await importOriginal<typeof DndKitModule>()

	return {
		...actual,
		DragDropProvider: (props: Parameters<typeof DndKitModule.DragDropProvider>[0]) => {
			// Through `unknown`: the library's handler types are generic over four parameters whose
			// arguments live in `@dnd-kit/abstract`, so they do not overlap the structural shapes this
			// file drives them with. The adapter casts across the same boundary in the same direction.
			capture.current = props as unknown as CapturedHandlers
			return createElement(actual.DragDropProvider, props)
		},
	}
})

/** Forget what the last mount captured. A call rather than an assignment, so nothing narrows. */
function resetCapture(): void {
	capture.current = null
}

/** The handlers of the provider the adapter mounted most recently. */
function capturedHandlers(): CapturedHandlers {
	const handlers = capture.current
	if (!handlers) throw new Error('the adapter did not mount dnd-kit’s provider')

	return handlers
}

const useSortableSpy = vi.mocked(useSortable)

afterEach(() => {
	useSortableSpy.mockClear()
})

/** A `dragend` event with the fields the adapter reads. */
function dragEnd(overrides: Partial<SortableDragEndEvent> = {}): SortableDragEndEvent {
	return {
		canceled: false,
		operation: {
			/*
			 * `initialIndex` sits on `sortable`, not on the source itself — the draggable proxies only
			 * `index`, which is what made an earlier version of this adapter refuse every real drop.
			 * `index` differs from `initialIndex` — an item that actually travelled, which is the only
			 * thing the two indices are still compared for.
			 *
			 * The fixture's **target carries the source's own id**, because that is what the library
			 * really reports: `OptimisticSortingPlugin` ends every displacement by setting the drop
			 * target to the source. So it is the remembered hover that names the landing place — see
			 * {@link dropOf}.
			 */
			source: {
				id: 'row:table:row-1',
				type: 'row:table',
				index: 3,
				sortable: { index: 3, initialIndex: 0, group: 'row:table' },
			},
			target: { id: 'row:table:row-1', type: 'row:table' },
		},
		...overrides,
	}
}

/** A target id the pointer was legally over, as {@link dropOf} supplies it. */
const HOVERED = 'hovered-target'

/** An anchor pair that says the item travelled: a different neighbour at each end. */
const TRAVELLED: { startAnchor: DragAnchor; endAnchor: DragAnchor } = {
	startAnchor: { side: AnchorSide.Before, id: 'row:table:row-0' },
	endAnchor: { side: AnchorSide.Before, id: 'row:table:row-4' },
}

/**
 * `toDropEvent` with the context the provider would have gathered for this operation.
 *
 * Two things it supplies, neither of which a `dragend` event carries. A **remembered hover**, because
 * every fixture reports the source as the library's own target — the degeneracy the id contract is
 * built around rather than a quirk of these fixtures. And an **anchor pair that differs**, because
 * "did the item travel" is answered by comparing the source's neighbour at the two ends of the
 * operation. The cases under "the landing place" and "whether the item travelled" drive each argument
 * on its own.
 */
const dropOf = (event: SortableDragEndEvent) => toDropEvent(event, { hoveredTargetId: HOVERED, ...TRAVELLED })

/** Renders one registered item and hands back what the adapter returned for it. */
function renderItem(spec: Parameters<typeof adapter.useSortableItem>[0]): { handle: SortableItemHandle | null } {
	const seen: { handle: SortableItemHandle | null } = { handle: null }
	function Item() {
		const handle = adapter.useSortableItem(spec)
		seen.handle = handle
		return <div ref={handle.ref} />
	}
	render(
		<adapter.Provider
			onDrop={() => {}}
			canDrop={() => true}
		>
			<Item />
		</adapter.Provider>,
	)

	return seen
}

describe('the adapter satisfies the port', () => {
	it('exposes a Provider and a useSortableItem', () => {
		expect(adapter.Provider).toBeTypeOf('function')
		expect(adapter.useSortableItem).toBeTypeOf('function')
	})

	it('returns exactly the three-member handle for a registered item', () => {
		// Arrange / Act — the hook needs dnd-kit's own provider above it, which is what
		// `adapter.Provider` mounts; rendering through it also checks the two halves compose.
		const seen = renderItem({ id: 'row-1', index: 0, axis: 'row', surface: 'table' })

		// Assert — exactly three, not at least three. The hook returns eight and the adapter maps
		// member by member precisely so an upstream addition cannot widen what this kit hands back.
		expect(Object.keys(seen.handle ?? {}).sort()).toEqual(['handleRef', 'isDragging', 'ref'])
		expect(seen.handle?.ref).toBeTypeOf('function')
		expect(seen.handle?.handleRef).toBeTypeOf('function')
		expect(seen.handle?.isDragging).toBe(false)
	})

	/*
	 * What the adapter actually decides is the *input* it builds; nothing downstream of
	 * `useSortable` is observable in jsdom, so the returned handle looks identical whatever the
	 * spec said. These two cases are the only place `type` / `accept` / `group` / `disabled` are
	 * pinned.
	 */
	it('maps the spec onto the sortable input, with the axis and surface on type, accept and group', () => {
		renderItem({ id: 'col-1', index: 2, axis: 'column', surface: 'table', disabled: true })

		expect(useSortableSpy.mock.calls[0]?.[0]).toEqual({
			id: 'column:table:col-1',
			index: 2,
			type: 'column:table',
			accept: 'column:table',
			group: 'column:table',
			disabled: true,
		})
	})

	/*
	 * `group` has its own case because it is the one member whose absence is invisible in a grid
	 * with a single axis — which every grid was until header dragging existed. It partitions the
	 * index space `OptimisticSortingPlugin` asserts is dense per group; unset, rows and columns
	 * share one space and both axes go dead. See the comment on it in `dnd.tsx`.
	 */
	it('groups an item by its axis and surface, so the index spaces stay separate', () => {
		renderItem({ id: 'row-1', index: 0, axis: 'row', surface: 'table' })
		expect(useSortableSpy.mock.calls[0]?.[0]).toMatchObject({ group: 'row:table' })
	})

	/*
	 * The panel's items sit in their own index space, which is the whole reason the key carries a
	 * surface: the header registers the visible leaves and the panel every listed leaf, so the two
	 * runs have different lengths and cannot share one dense `0..n-1` group.
	 */
	it('partitions a panel item away from a header item of the same axis', () => {
		renderItem({ id: 'col-1', index: 0, axis: 'column', surface: 'panel' })

		expect(useSortableSpy.mock.calls[0]?.[0]).toMatchObject({
			type: 'column:panel',
			accept: 'column:panel',
			group: 'column:panel',
		})
	})

	/**
	 * The registry is keyed by id across the whole manager, so the same column on two surfaces must
	 * register under two ids — measured the hard way: it did not, and opening the column panel stopped
	 * the header's handle from starting a drag at all, permanently and with nothing in the DOM to show
	 * why. `toSortableId` has the account.
	 */
	it('registers the same column under a different id on each surface', () => {
		renderItem({ id: 'name', index: 0, axis: 'column', surface: 'table' })
		const header = useSortableSpy.mock.calls[0]?.[0]
		useSortableSpy.mockClear()
		renderItem({ id: 'name', index: 0, axis: 'column', surface: 'panel' })
		const panel = useSortableSpy.mock.calls[0]?.[0]

		expect(header).toMatchObject({ id: 'column:table:name' })
		expect(panel).toMatchObject({ id: 'column:panel:name' })
	})

	it('leaves an id containing the separator byte-identical', () => {
		// The prefix is two segments drawn from two closed sets that contain no `:`, so the id itself
		// needs no escaping — and must come back exactly as it went in.
		renderItem({ id: 'a:b:c', index: 0, axis: 'column', surface: 'panel' })

		expect(useSortableSpy.mock.calls[0]?.[0]).toMatchObject({ id: 'column:panel:a:b:c' })
	})

	it('omits disabled rather than passing it as undefined', () => {
		// `exactOptionalPropertyTypes`: omitted and `undefined` are different things, and dnd-kit's
		// own types are not written under that flag. The conditional spread is what keeps them apart.
		renderItem({ id: 'row-1', index: 0, axis: 'row', surface: 'table' })

		expect(useSortableSpy.mock.calls[0]?.[0]).not.toHaveProperty('disabled')
	})
})

describe('translating a completed drag', () => {
	it('reports the landing place as an id, on the row axis', () => {
		// Arrange
		const event = dragEnd()

		// Act
		const drop = dropOf(event)

		// Assert — two ids and no position. The target is the hover, not the library's degenerate one.
		expect(drop).toEqual({ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: HOVERED })
	})

	it('reports the column axis from the source type', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'column:table:name', type: 'column:table', index: 0, sortable: { index: 0, initialIndex: 2 } },
					target: { id: 'column:table:name', type: 'column:table' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'column', surface: 'table', sourceId: 'name', targetId: HOVERED })
	})

	it('stringifies a numeric id', () => {
		// dnd-kit's `UniqueIdentifier` is `string | number`; the port's ids are strings.
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row:table:1', type: 'row:table', index: 2, sortable: { index: 2, initialIndex: 0 } },
					target: { id: 'row:table:1', type: 'row:table' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'row', surface: 'table', sourceId: '1', targetId: HOVERED })
	})

	it('refuses an aborted drag', () => {
		// Escape, or a programmatic cancel. A release over nothing is the *next* case — dnd-kit
		// reports that one as `canceled: false` with a null target.
		expect(dropOf(dragEnd({ canceled: true }))).toBeNull()
	})

	it('refuses a drop with no target', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row:table:row-1', type: 'row:table', index: 3, sortable: { index: 3, initialIndex: 0 } },
					target: null,
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a drag that ended where it began', () => {
		/*
		 * Nothing moved, so committing would fire `onChange` with a no-op and break the "exactly one per
		 * drag" promise from the other side. Said with the **anchor**, which is what answers this now:
		 * the same neighbour on the same side at both ends of the operation. The fixture's `index` and
		 * `initialIndex` are left as they were and are not read — see "whether the item travelled".
		 */
		const sameNeighbour: DragAnchor = { side: AnchorSide.Before, id: 'row:table:row-0' }
		const drop = toDropEvent(dragEnd(), {
			hoveredTargetId: HOVERED,
			startAnchor: sameNeighbour,
			endAnchor: { ...sameNeighbour },
		})

		expect(drop).toBeNull()
	})

	it('refuses a source with no sortable behind it — a plain draggable', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row:table:row-1', type: 'row:table' },
					target: { id: 'row:table:row-1', type: 'row:table' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a type this adapter did not set', () => {
		// Another DragDropProvider in the tree, or a draggable of some other kind. Not ours.
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'something-else:x', type: 'something-else', index: 1, sortable: { index: 1, initialIndex: 0 } },
					target: { id: 'something-else:x', type: 'something-else' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a target of a different kind', () => {
		// `accept` gates collisions, so a row cannot reach a column today. It cannot gate a droppable
		// registered without an `accept` — a trash zone, a group header — and such a drop would
		// otherwise commit against a foreign entity.
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row:table:row-1', type: 'row:table', index: 3, sortable: { index: 3, initialIndex: 0 } },
					target: { id: 'trash' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	/*
	 * The panel is the second surface of the column axis, and its whole reason to exist is that its
	 * index space is a different list — see `toDragKey`. A drop has to carry which one it came from,
	 * because the grid commits under that surface's `ColumnMoveScope`.
	 */
	it('reports the panel surface, on the same axis as the header', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'column:panel:name', type: 'column:panel', index: 4, sortable: { index: 4, initialIndex: 1 } },
					target: { id: 'column:panel:name', type: 'column:panel' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'column', surface: 'panel', sourceId: 'name', targetId: HOVERED })
	})

	it('refuses a key with a surface this adapter did not set', () => {
		// The axis half parses and the surface half does not. Refusing the whole key rather than
		// defaulting the surface is the point: a default would put the item in another surface's
		// index space, which is the silent-death case the field exists to prevent.
		const drop = dropOf(
			dragEnd({
				operation: {
					source: {
						id: 'column:sidebar:name',
						type: 'column:sidebar',
						index: 1,
						sortable: { index: 1, initialIndex: 0 },
					},
					target: { id: 'column:sidebar:name', type: 'column:sidebar' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a key with more than two parts', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: {
						id: 'column:panel:extra:name',
						type: 'column:panel:extra',
						index: 1,
						sortable: { index: 1, initialIndex: 0 },
					},
					target: { id: 'column:panel:extra:name', type: 'column:panel:extra' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a bare axis with no surface — the key shape this adapter wrote before the panel', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row-1', type: 'row', index: 3, sortable: { index: 3, initialIndex: 0 } },
					target: { id: 'row-1', type: 'row' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('recovers an id containing the separator from the registered one', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: {
						id: 'column:panel:a:b:c',
						type: 'column:panel',
						index: 2,
						sortable: { index: 2, initialIndex: 0 },
					},
					target: { id: 'column:panel:a:b:c', type: 'column:panel' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'column', surface: 'panel', sourceId: 'a:b:c', targetId: HOVERED })
	})

	it('refuses a registered id with no partition prefix', () => {
		// A draggable registered by something other than this adapter, under a bare id.
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'name', type: 'column:table', index: 1, sortable: { index: 1, initialIndex: 0 } },
					target: { id: 'name', type: 'column:table' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a source with no type at all', () => {
		const drop = dropOf(
			dragEnd({
				operation: {
					source: { id: 'row:table:x', index: 1, sortable: { index: 1, initialIndex: 0 } },
					target: { id: 'row:table:y', type: 'row:table' },
				},
			}),
		)

		expect(drop).toBeNull()
	})
})

/**
 * Where the landing place comes from — the argument `toDropEvent` takes beside the event.
 *
 * This is the whole of the id contract. The library's own `target` is the source once anything has
 * been displaced, so the honest answer is the last target the pointer was over that the grid allowed,
 * which the provider remembers from its `dragover` handler.
 */
describe('the landing place', () => {
	const movedRow = (target: { id: string; type?: string }): SortableDragEndEvent => ({
		canceled: false,
		operation: {
			source: {
				id: 'row:table:row-1',
				type: 'row:table',
				index: 3,
				sortable: { index: 3, initialIndex: 0, group: 'row:table' },
			},
			target,
		},
	})

	it('is the remembered hover, not the library’s own target', () => {
		// Arrange — the library reports the source as its target, as it does after any displacement,
		// and the pointer was last legally over something else.
		const event = movedRow({ id: 'row:table:row-1', type: 'row:table' })

		// Act
		const drop = toDropEvent(event, { hoveredTargetId: 'row-9', ...TRAVELLED })

		// Assert
		expect(drop).toEqual({ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-9' })
	})

	it('wins over the library’s target even when that one is a different item', () => {
		/*
		 * The order matters and is not a preference. A hover the grid **refused** was never remembered,
		 * so the library's target can be an item the pointer merely came to rest on illegally. Taking
		 * it ahead of the remembered one would commit a refusable drop and throw away the legal
		 * position the item was actually displaced to.
		 */
		const drop = toDropEvent(movedRow({ id: 'row:table:row-7', type: 'row:table' }), {
			hoveredTargetId: 'row-9',
			...TRAVELLED,
		})

		expect(drop).toMatchObject({ targetId: 'row-9' })
	})

	it('falls back to the library’s target when no hover was remembered', () => {
		// An operation that delivered no usable `dragover` — a keyboard pickup whose first collision
		// was the commit, or a future version that stops dispatching one. A real target is still a
		// target.
		const drop = toDropEvent(movedRow({ id: 'row:table:row-7', type: 'row:table' }), {
			hoveredTargetId: null,
			...TRAVELLED,
		})

		expect(drop).toMatchObject({ sourceId: 'row-1', targetId: 'row-7' })
	})

	it('refuses the drop when neither end names anything but the source', () => {
		// No hover remembered and the library's target is the degenerate one. There is no landing place
		// to name, so there is no drop — reporting the source as its own target would be a lie the
		// grid would then have to catch.
		expect(
			toDropEvent(movedRow({ id: 'row:table:row-1', type: 'row:table' }), { hoveredTargetId: null, ...TRAVELLED }),
		).toBeNull()
	})

	it('refuses a remembered hover that is the source itself', () => {
		// An adapter cannot produce this — `toDragOverEvent` filters a self-hover — but the port's
		// promise is that `targetId` is never the source, and it is kept here rather than assumed.
		expect(
			toDropEvent(movedRow({ id: 'row:table:row-7', type: 'row:table' }), { hoveredTargetId: 'row-1', ...TRAVELLED }),
		).toBeNull()
	})
})

/**
 * Whether the item travelled, which is the one question still asked of the group's ordering.
 *
 * It used to be `index === initialIndex`. Those two numbers are measured against different lists once
 * a virtualized window has scrolled — one frozen at drag start, one rewritten by React every frame —
 * and the comparison silently refused real drops. `toDragAnchor` answers it with a neighbour's **id**
 * instead; these cases pin the lookup and the comparison, and the provider cases below drive the three
 * gestures that matter end to end.
 */
describe('whether the item travelled', () => {
	/** A registry whose order is the array's order, all in one group. */
	const managerOf = (group: string, ids: string[]): SortableManager => ({
		registry: { droppables: ids.map((id, index) => ({ id, sortable: { index, group } })) },
	})

	describe('toDragAnchor', () => {
		it('is the item before the source', () => {
			// Arrange
			const manager = managerOf('row:table', ['row:table:a', 'row:table:b', 'row:table:c'])

			// Act / Assert
			expect(toDragAnchor(manager, 'row:table:b', 'row:table')).toEqual({
				side: AnchorSide.Before,
				id: 'row:table:a',
			})
		})

		it('is the item after the source when the source is first', () => {
			// Nothing precedes it, so the successor is what names its place — and the side records which
			// of the two answers this is, because a source that stops being first has moved by that fact
			// alone.
			const manager = managerOf('row:table', ['row:table:a', 'row:table:b'])

			expect(toDragAnchor(manager, 'row:table:a', 'row:table')).toEqual({
				side: AnchorSide.After,
				id: 'row:table:b',
			})
		})

		it('orders the group by index rather than by registration', () => {
			// The registry is a set, not a list: a row that mounted later can sit earlier. Sorting by
			// index is what makes the neighbour the visual one.
			const manager: SortableManager = {
				registry: {
					droppables: [
						{ id: 'row:table:c', sortable: { index: 2, group: 'row:table' } },
						{ id: 'row:table:a', sortable: { index: 0, group: 'row:table' } },
						{ id: 'row:table:b', sortable: { index: 1, group: 'row:table' } },
					],
				},
			}

			expect(toDragAnchor(manager, 'row:table:c', 'row:table')).toEqual({
				side: AnchorSide.Before,
				id: 'row:table:b',
			})
		})

		it('looks only inside the source’s own group', () => {
			// The whole point of the partition: a header cell and a panel row of the same column are two
			// index spaces, and an anchor drawn across them would be meaningless. `b` is first in its own
			// group, so its anchor is the successor there — never the column item at index 0.
			const manager: SortableManager = {
				registry: {
					droppables: [
						{ id: 'column:panel:name', sortable: { index: 0, group: 'column:panel' } },
						{ id: 'row:table:b', sortable: { index: 0, group: 'row:table' } },
						{ id: 'row:table:c', sortable: { index: 1, group: 'row:table' } },
					],
				},
			}

			expect(toDragAnchor(manager, 'row:table:b', 'row:table')).toEqual({
				side: AnchorSide.After,
				id: 'row:table:c',
			})
		})

		it('is null for a group of one — there is nothing to move within', () => {
			expect(toDragAnchor(managerOf('row:table', ['row:table:a']), 'row:table:a', 'row:table')).toBeNull()
		})

		it('is null for a source the group does not hold', () => {
			const manager = managerOf('row:table', ['row:table:a', 'row:table:b'])

			expect(toDragAnchor(manager, 'row:table:z', 'row:table')).toBeNull()
		})

		it('ignores an entry with no sortable behind it', () => {
			// A plain droppable registered in the same provider — a trash zone, say. It has no place in
			// the index space and must not become anybody's neighbour.
			const manager: SortableManager = {
				registry: {
					droppables: [
						{ id: 'trash' },
						{ id: 'row:table:a', sortable: { index: 0, group: 'row:table' } },
						{ id: 'row:table:b', sortable: { index: 1, group: 'row:table' } },
					],
				},
			}

			expect(toDragAnchor(manager, 'row:table:b', 'row:table')).toEqual({
				side: AnchorSide.Before,
				id: 'row:table:a',
			})
		})
	})

	describe('hasTravelled', () => {
		const before = (id: string): DragAnchor => ({ side: AnchorSide.Before, id })

		it('is false for the same neighbour on the same side', () => {
			expect(hasTravelled(before('row:table:a'), before('row:table:a'))).toBe(false)
		})

		it('is true for a different neighbour', () => {
			expect(hasTravelled(before('row:table:a'), before('row:table:b'))).toBe(true)
		})

		it('is true for the same neighbour on the other side', () => {
			// The source was first and is anchored to its successor; now that item precedes it. Same id,
			// and the item has unambiguously moved — which is why the side is half of the anchor.
			expect(hasTravelled({ side: AnchorSide.After, id: 'row:table:a' }, before('row:table:a'))).toBe(true)
		})

		it('is false when either end has no anchor', () => {
			expect(hasTravelled(null, before('row:table:a'))).toBe(false)
			expect(hasTravelled(before('row:table:a'), null)).toBe(false)
		})
	})
})

/**
 * The provider's half of both contracts: which hover it remembers, which anchor it takes at pickup,
 * and when it forgets them.
 *
 * Driven through the handlers it hands dnd-kit, which the wrapped provider captures. A pointer cannot
 * be simulated in jsdom, but these handlers are exactly what the library calls, with exactly these
 * shapes — and `dragstart` and every `dragover` receive a manager, which is where a group's order
 * lives. Giving them different orders is how a displacement, and a scrolled window, is expressed here.
 *
 * **The order a hover carries is the order *after* the displacement that hover causes**, because that
 * is the frame the adapter records: the sorting plugin writes the new indices and then calls
 * `setDropTarget(source.id)` (`@dnd-kit/dom@0.1.21/sortable.js:409-418`), which dispatches a further
 * `dragover` synchronously (`@dnd-kit/abstract@0.1.21/index.js:662-677`). One call here stands for
 * that pair. `dragend` is handed no order at all — see the last case for why that is the fix.
 */
describe('remembering the hover and the anchor', () => {
	const GROUP = 'row:table'
	const sortableId = (id: string) => `${GROUP}:${id}`

	/** A registry whose order is the array's order, all of it in one group. */
	const orderOf = (ids: string[]): RenderingManager => ({
		registry: { droppables: ids.map((id, index) => ({ id: sortableId(id), sortable: { index, group: GROUP } })) },
		renderer: { rendering: Promise.resolve() },
	})

	const hover = (sourceId: string, targetId: string): SortableDragOverEvent => ({
		operation: {
			source: { id: sortableId(sourceId), type: GROUP },
			target: { id: sortableId(targetId), type: GROUP },
		},
		preventDefault: () => {},
	})

	/**
	 * A release, with the source as its own target — what the library reports once anything has been
	 * displaced.
	 *
	 * `index` and `initialIndex` are carried because two cases below turn on what they *would* have
	 * said. Nothing reads them: they are there to make the misfire expressible.
	 */
	const release = (sourceId: string, indices: { index: number; initialIndex: number }): SortableDragEndEvent => ({
		canceled: false,
		operation: {
			source: {
				id: sortableId(sourceId),
				type: GROUP,
				index: indices.index,
				sortable: { ...indices, group: GROUP },
			},
			target: { id: sortableId(sourceId), type: GROUP },
		},
	})

	/** A release whose indices say "travelled", for the cases that are not about the anchor. */
	const moved = (sourceId: string) => release(sourceId, { index: 2, initialIndex: 0 })

	function mountProvider(canDrop: (event: DndDragOverEvent) => boolean = () => true) {
		const drops: DndDropEvent[] = []
		const displacements: DndDragOverEvent[] = []
		resetCapture()
		render(
			<adapter.Provider
				onDrop={(event) => drops.push(event)}
				canDrop={canDrop}
				onDisplace={(event) => displacements.push(event)}
			>
				<div />
			</adapter.Provider>,
		)

		return { props: capturedHandlers(), drops, displacements }
	}

	it('takes the end anchor again once a displacement the grid renders has landed', async () => {
		/*
		 * In a virtualized body the grid renders the displacement itself, from `onDisplace`, and the
		 * plugin stands down — so the plugin's closing `setDropTarget(source.id)`, whose `dragover` is
		 * what normally records the displaced anchor, never comes. The only anchor recorded on the hover
		 * is the one before the render, which for a one-step drag equals the start one. Re-taking it once
		 * `renderer.rendering` settles is what keeps that drag from being refused.
		 */
		const { props, drops } = mountProvider()
		const before = ['row-1', 'row-2', 'row-3']
		let rendered: () => void = () => {}
		const manager = orderOf(before)
		manager.renderer.rendering = new Promise<void>((resolve) => {
			rendered = resolve
		})
		props.onDragStart?.(moved('row-1'), orderOf(before))
		props.onDragOver?.(hover('row-1', 'row-2'), manager)

		// The grid's render lands: the registry now carries the displaced indices.
		manager.registry = orderOf(['row-2', 'row-1', 'row-3']).registry
		rendered()
		await manager.renderer.rendering
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-2' }])
	})

	it('drops a re-taken anchor that arrives after its drag has ended', async () => {
		// A promise can outlive the operation it was taken in; its write must not land in the next one.
		const { props, drops } = mountProvider()
		const manager = orderOf(['row-1', 'row-2', 'row-3'])
		let rendered: () => void = () => {}
		manager.renderer.rendering = new Promise<void>((resolve) => {
			rendered = resolve
		})
		props.onDragStart?.(moved('row-1'), orderOf(['row-1', 'row-2', 'row-3']))
		props.onDragOver?.(hover('row-1', 'row-2'), manager)
		props.onDragEnd?.(moved('row-1'))

		// A second drag of the same row starts and hovers a row without anything being displaced yet —
		// and only then does the first drag's render settle, reporting a displacement of its own.
		props.onDragStart?.(moved('row-1'), orderOf(['row-1', 'row-2', 'row-3']))
		props.onDragOver?.(hover('row-1', 'row-3'), orderOf(['row-1', 'row-2', 'row-3']))
		await Promise.resolve()
		manager.registry = orderOf(['row-2', 'row-1', 'row-3']).registry
		rendered()
		await manager.renderer.rendering
		props.onDragEnd?.(moved('row-1'))

		// The first drag's write would read as a move for the second, which never travelled.
		expect(drops).toEqual([])
	})

	it('tells the grid about every allowed displacement, in order, and about nothing else', () => {
		/*
		 * `onDisplace` is what a virtualized body renders the drag's arrangement from, and that arrangement
		 * is a sequence of steps — so every allowed hover has to arrive, in order. A refused hover is not a
		 * displacement (`preventDefault` stopped it), and a self-hover is the library reporting the source
		 * over its own new slot, not a step: forwarding either would move the grid's arrangement where the
		 * library's did not go.
		 */
		const { props, displacements } = mountProvider((event) => event.targetId !== 'row-6')
		props.onDragStart?.(moved('row-1'), orderOf(['row-1', 'row-4', 'row-5', 'row-6']))
		props.onDragOver?.(hover('row-1', 'row-4'), orderOf(['row-4', 'row-1', 'row-5', 'row-6']))
		props.onDragOver?.(hover('row-1', 'row-1'), orderOf(['row-4', 'row-1', 'row-5', 'row-6']))
		props.onDragOver?.(hover('row-1', 'row-5'), orderOf(['row-4', 'row-5', 'row-1', 'row-6']))
		props.onDragOver?.(hover('row-1', 'row-6'), orderOf(['row-4', 'row-5', 'row-1', 'row-6']))

		expect(displacements).toEqual([
			{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-4' },
			{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-5' },
		])
	})

	it('reports the last allowed hover as the drop’s target', () => {
		// Arrange / Act — picked up first in its group, two legal steps, released last.
		const { props, drops } = mountProvider()
		props.onDragStart?.(moved('row-1'), orderOf(['row-1', 'row-4', 'row-5']))
		props.onDragOver?.(hover('row-1', 'row-4'), orderOf(['row-4', 'row-1', 'row-5']))
		props.onDragOver?.(hover('row-1', 'row-5'), orderOf(['row-4', 'row-5', 'row-1']))
		props.onDragEnd?.(moved('row-1'))

		// Assert — the later of the two hovers, and not the source the library named.
		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-5' }])
	})

	it('keeps the last allowed hover when a refused one follows it', () => {
		/*
		 * The pointer steps onto something illegal and is released there. `preventDefault` stopped that
		 * displacement, so what the user is looking at is the position the legal step reached — and that
		 * is what gets committed.
		 */
		const { props, drops } = mountProvider((event) => event.targetId !== 'row-6')
		const displaced = ['row-5', 'row-1', 'row-6']
		props.onDragStart?.(moved('row-1'), orderOf(['row-1', 'row-5', 'row-6']))
		props.onDragOver?.(hover('row-1', 'row-5'), orderOf(displaced))
		// Refused, so nothing moves: the order this frame carries is the one the legal step reached.
		props.onDragOver?.(hover('row-1', 'row-6'), orderOf(displaced))
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-5' }])
	})

	it('reports nothing when every hover was refused', () => {
		const unchanged = ['row-1', 'row-5', 'row-6']
		const { props, drops } = mountProvider(() => false)
		props.onDragStart?.(moved('row-1'), orderOf(unchanged))
		props.onDragOver?.(hover('row-1', 'row-5'), orderOf(unchanged))
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toEqual([])
	})

	it('reports nothing for an item dragged away and back, though a hover was remembered', () => {
		/*
		 * **The one case the ids cannot answer, and the whole reason a travel check survives into an
		 * id-only port.** Two legal steps away and one back: the last *allowed* hover names a row the
		 * item merely passed over, because `toDragOverEvent` filters the self-hover and so a return to
		 * the origin is never recorded as a hover of its own. Committing that id would move a row the
		 * user explicitly put back.
		 *
		 * The anchor is what tells a round trip from a move: the group's order at release is the order at
		 * pickup, so the source has the same neighbour on the same side. Delete the `hasTravelled` check
		 * in `toDropEvent` and this case commits a move nobody made.
		 */
		const unchanged = ['row-0', 'row-1', 'row-2', 'row-3']
		const { props, drops } = mountProvider()
		props.onDragStart?.(moved('row-1'), orderOf(unchanged))
		props.onDragOver?.(hover('row-1', 'row-2'), orderOf(['row-0', 'row-2', 'row-1', 'row-3']))
		props.onDragOver?.(hover('row-1', 'row-3'), orderOf(['row-0', 'row-2', 'row-3', 'row-1']))
		// Back where it started, so the last frame carries the order the drag opened on.
		props.onDragOver?.(hover('row-1', 'row-2'), orderOf(unchanged))
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toEqual([])
	})

	it('reports a genuine move, where the neighbour changed', () => {
		// The control for the case above: the same gesture, released somewhere else, so the source has a
		// different predecessor and the drop is committed.
		const { props, drops } = mountProvider()
		props.onDragStart?.(moved('row-1'), orderOf(['row-0', 'row-1', 'row-2', 'row-3']))
		props.onDragOver?.(hover('row-1', 'row-3'), orderOf(['row-0', 'row-2', 'row-3', 'row-1']))
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-3' }])
	})

	it('reports the first row dragged far down a virtualized grid, which the index pair refused', () => {
		/*
		 * **The silent failure the anchor exists for.** The source is the first row of the published
		 * window and is dragged down until auto-scroll has carried the window past it. The held row sorts
		 * above every row in the new window, so it is re-inserted at published position `0` — and the
		 * fixture says so: `index` and `initialIndex` are both `0`, which is exactly what
		 * `index === initialIndex` used to read as "never moved", silently refusing a move of a hundred
		 * rows.
		 *
		 * The anchor is unaffected, because it is an id: the source is still first, but its successor is
		 * now a row from the scrolled window rather than the original one. Restore the index comparison
		 * and this case fails.
		 */
		const { props, drops } = mountProvider()
		const atRest = release('row-6', { index: 0, initialIndex: 0 })
		props.onDragStart?.(atRest, orderOf(['row-6', 'row-105', 'row-106']))
		props.onDragOver?.(hover('row-6', 'row-108'), orderOf(['row-6', 'row-110', 'row-111']))
		props.onDragEnd?.(atRest)

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-6', targetId: 'row-108' }])
	})

	it('reports the last row dragged far up a virtualized grid, the mirror of the same case', () => {
		// Held below the window instead of above it, so it stays last and keeps its index — `2` at both
		// ends — while its predecessor changes with the window.
		const { props, drops } = mountProvider()
		const atRest = release('row-6', { index: 2, initialIndex: 2 })
		props.onDragStart?.(atRest, orderOf(['row-105', 'row-106', 'row-6']))
		props.onDragOver?.(hover('row-6', 'row-101'), orderOf(['row-101', 'row-102', 'row-6']))
		props.onDragEnd?.(atRest)

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-6', targetId: 'row-101' }])
	})

	it('reports a move a re-render undid the indices of, which recomputing at release refused', () => {
		/*
		 * **Why the end anchor is recorded as the drag runs instead of read at release.**
		 * `useSortable`'s layout effect assigns `sortable.index = index` whenever the prop changes, with
		 * no guard for an operation in flight (`@dnd-kit/react@0.1.21/sortable.js:61-67`), and in a
		 * virtualized grid that prop is the row's position in the **undisplaced** list the body
		 * publishes. So a re-render landing between the last displacement and the release — an
		 * `infinite` grid whose `loadMore` resolves while a row is held — puts the whole group back in
		 * the order the drag opened on. An anchor computed from the manager at `dragend` then equals the
		 * one taken at `dragstart`, and a move of hundreds of rows is refused with nothing to show for
		 * it.
		 *
		 * The gesture below is the one from the case above, and the release is handed exactly that reset
		 * order — the registry as a recomputation would have found it. The adapter does not read it,
		 * which is what makes the drop survive; restore the `dragend` computation and this case refuses.
		 */
		const published = ['row-0', 'row-1', 'row-2', 'row-3']
		const { props, drops } = mountProvider()
		props.onDragStart?.(moved('row-1'), orderOf(published))
		props.onDragOver?.(hover('row-1', 'row-3'), orderOf(['row-0', 'row-2', 'row-3', 'row-1']))
		props.onDragEnd?.(moved('row-1'), orderOf(published))

		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-3' }])
	})

	it('forgets both the hover and the anchor between operations', () => {
		// A second drag must inherit neither. The second operation records no hover and ends on the order
		// it started from, so it commits nothing even though the first one committed.
		const { props, drops } = mountProvider()
		props.onDragStart?.(moved('row-1'), orderOf(['row-0', 'row-1', 'row-2']))
		props.onDragOver?.(hover('row-1', 'row-2'), orderOf(['row-0', 'row-2', 'row-1']))
		props.onDragEnd?.(moved('row-1'))
		expect(drops).toHaveLength(1)

		props.onDragStart?.(moved('row-1'), orderOf(['row-0', 'row-1', 'row-2']))
		props.onDragEnd?.(moved('row-1'))

		expect(drops).toHaveLength(1)
	})
})

/**
 * `toDragOverEvent` — the predicate side of the adapter, and the half that keeps a refused drop from
 * ever happening.
 *
 * A hover is invisible in jsdom, so these exercise the pure translation directly. What the provider
 * does with the answer — `event.preventDefault()`, which this library's `setDropTarget` reads as
 * "not a landing place" — is the browser spec's business.
 */
describe('toDragOverEvent', () => {
	const dragOver = (
		source: { id: string; type?: string } | null,
		target: { id: string; type?: string } | null,
	): SortableDragOverEvent => ({
		operation: { source, target },
		preventDefault: () => {},
	})

	it('reports both ends as ids, which is what the core canDrop helpers take', () => {
		expect(
			toDragOverEvent(
				dragOver(
					{ id: 'column:table:name', type: 'column:table' },
					{ id: 'column:table:salary', type: 'column:table' },
				),
			),
		).toEqual({
			axis: 'column',
			surface: 'table',
			sourceId: 'name',
			targetId: 'salary',
		})
	})

	/*
	 * The case that would break every legal drag if it were treated as a refusal: after the first
	 * displacement the source occupies its destination, so the collision resolves to the source
	 * itself. There is no question to ask, and asking it would answer "no".
	 */
	it('asks nothing when the source is hovering itself', () => {
		expect(
			toDragOverEvent(
				dragOver({ id: 'column:table:name', type: 'column:table' }, { id: 'column:table:name', type: 'column:table' }),
			),
		).toBeNull()
	})

	it('asks nothing when either end is missing', () => {
		expect(toDragOverEvent(dragOver(null, { id: 'column:table:name', type: 'column:table' }))).toBeNull()
		expect(toDragOverEvent(dragOver({ id: 'column:table:name', type: 'column:table' }, null))).toBeNull()
	})

	it('asks nothing about a type this adapter did not set, on either end', () => {
		expect(toDragOverEvent(dragOver({ id: 'x', type: 'trash' }, { id: 'y', type: 'trash' }))).toBeNull()
		expect(
			toDragOverEvent(
				dragOver({ id: 'column:table:name', type: 'column:table' }, { id: 'row:table:1', type: 'row:table' }),
			),
		).toBeNull()
	})
})

/**
 * The sensors, and why these cases exist at all.
 *
 * Passing `sensors` **opts out of `defaultPreset`**, so the keyboard sensor the preset supplied has
 * to be listed by hand — and a kit that silently lost it would look exactly like a kit that never
 * had it. These cases therefore assert the configuration object the adapter hands the provider,
 * which is the limit of what is reachable at unit level: driving a real keyboard pickup needs
 * layout, and jsdom reports every element as zero-sized, for the reason recorded at the top of this
 * file. What is asserted is that the keyboard sensor is in the array, that the pointer sensor is
 * configured with this module's constraints, and that each constraint comes out as intended. That a
 * keyboard pickup then *works* is Playwright's.
 */
describe('the sensors the adapter mounts', () => {
	/** The array the adapter passed the provider, mounted fresh. */
	function mountedSensors(): readonly unknown[] {
		resetCapture()
		renderItem({ id: 'row-1', index: 0, axis: 'row', surface: 'table' })
		const { sensors } = capturedHandlers()
		if (!sensors) throw new Error('the adapter passed no sensors, so the preset is back')

		return sensors
	}

	/*
	 * The case this whole block is for. `KeyboardSensor` is listed as the bare class — nothing about
	 * it is configured — so identity is the assertion, and it holds because the module mock above
	 * spreads the real exports rather than replacing them.
	 */
	it('lists the keyboard sensor, which opting out of the preset would otherwise delete', () => {
		expect(mountedSensors()).toContain(KeyboardSensor)
	})

	/*
	 * The library's own handle-only gate, driven directly: it is what keeps a keyboard pickup away
	 * from the sort toggle and the selection checkbox, and the adapter relies on it rather than
	 * writing one. Listing the sensor unconfigured is what keeps this default in force.
	 */
	it('keeps the keyboard activation on the handle alone', () => {
		const handle = document.createElement('button')
		const row = document.createElement('div')
		row.append(handle)
		// Through `unknown`: `shouldActivate` takes the library's own `Draggable`, which lives in
		// `@dnd-kit/abstract`. The two fields it reads are the two given here.
		const shouldActivate = KeyboardSensor.defaults.shouldActivate as unknown as (args: {
			event: { target: Element }
			source: { handle?: Element; element: Element }
		}) => boolean

		expect(shouldActivate({ event: { target: handle }, source: { handle, element: row } })).toBe(true)
		expect(shouldActivate({ event: { target: row }, source: { handle, element: row } })).toBe(false)
	})

	it('configures the pointer sensor with this module’s constraints', () => {
		const descriptor = mountedSensors().find(
			(sensor): sensor is { plugin: unknown; options?: { activationConstraints?: unknown } } =>
				typeof sensor === 'object' && sensor !== null && 'plugin' in sensor,
		)

		expect(descriptor?.plugin).toBe(PointerSensor)
		expect(descriptor?.options?.activationConstraints).toBe(dragActivationConstraints)
	})

	/*
	 * The four branches, driven through the parameter pair upstream passes. The handle is the axis
	 * that matters: a sortable need not render one — `dragHandle` is a render argument of
	 * `<DataGrid.HeaderCell>` and `<RowDragHandle/>` an offered child, while the sortable is
	 * registered either way — so every case states whether the pointer came down on a handle, and
	 * the handle-less ones are the cases a `pointerType`-only check got wrong.
	 */
	describe('the pointer activation constraints', () => {
		/** A header cell holding a filter input, and a handle inside it only when asked for one. */
		function sortableElement({ withHandle }: { withHandle: boolean }): {
			source: { handle?: Element }
			handle: Element | null
			input: Element
		} {
			const cell = document.createElement('div')
			const input = document.createElement('input')
			cell.append(input)
			if (!withHandle) return { source: {}, handle: null, input }

			const handle = document.createElement('button')
			cell.append(handle)

			return { source: { handle }, handle, input }
		}

		/** An event with the three fields the constraints read. */
		const pointerDown = (pointerType: string, target: Element | null): DragActivationEvent => ({
			pointerType,
			target,
			defaultPrevented: false,
		})

		/*
		 * The one deviation from upstream, and the whole behavioural change: upstream returns
		 * `undefined` here, so the drag began on the `pointerdown` itself.
		 */
		it('gives a mouse on the handle a distance and no delay', () => {
			const { source, handle } = sortableElement({ withHandle: true })

			expect(dragActivationConstraints(pointerDown('mouse', handle), source)).toEqual({ distance: { value: 5 } })
		})

		/*
		 * The HIGH this block exists for. Keyed on `pointerType` alone, this reached the distance
		 * branch and a few pixels of text selection started a column drag; upstream abandons the
		 * gesture on the first pixel, which is what `tolerance: 0` says.
		 */
		it('leaves a mouse in a text field on the library’s zero tolerance, handle or no handle', () => {
			const withHandle = sortableElement({ withHandle: true })
			const without = sortableElement({ withHandle: false })
			const zeroTolerance = { delay: { value: 200, tolerance: 0 } }

			expect(dragActivationConstraints(pointerDown('mouse', withHandle.input), withHandle.source)).toEqual(
				zeroTolerance,
			)
			expect(dragActivationConstraints(pointerDown('mouse', without.input), without.source)).toEqual(zeroTolerance)
		})

		/** A `contenteditable` cell is a text field too, and `contenteditable='false'` is not. */
		it('counts a contenteditable element as a text field, and false as not one', () => {
			const editable = document.createElement('div')
			editable.setAttribute('contenteditable', 'true')
			const plain = document.createElement('div')
			plain.setAttribute('contenteditable', 'false')

			expect(dragActivationConstraints(pointerDown('mouse', editable), {})).toEqual({
				delay: { value: 200, tolerance: 0 },
			})
			expect(dragActivationConstraints(pointerDown('mouse', plain), {})).toEqual({
				delay: { value: 200, tolerance: 10 },
				distance: { value: 5 },
			})
		})

		/*
		 * The library's own 250 ms / 5 px, adopted rather than retuned: a finger that strays before
		 * the delay is scrolling, and the tolerance is what hands the gesture back to the scroller.
		 * Touch is checked before the handle, so it holds for a handle-less sortable too.
		 */
		it('keeps the library’s delay and tolerance for a finger', () => {
			const { source, handle } = sortableElement({ withHandle: true })
			const touch = { delay: { value: 250, tolerance: 5 } }

			expect(dragActivationConstraints(pointerDown('touch', handle), source)).toEqual(touch)
			expect(dragActivationConstraints(pointerDown('touch', sortableElement({ withHandle: false }).input), {})).toEqual(
				touch,
			)
		})

		/** A pen, and a mouse that came down outside the handle, keep the library's values. */
		it('leaves every other pointer on the library’s values', () => {
			const { source, handle } = sortableElement({ withHandle: true })
			const fallback = { delay: { value: 200, tolerance: 10 }, distance: { value: 5 } }

			expect(dragActivationConstraints(pointerDown('pen', handle), source)).toEqual(fallback)
			expect(dragActivationConstraints(pointerDown('mouse', document.createElement('span')), source)).toEqual(fallback)
			expect(dragActivationConstraints(pointerDown('mouse', null), source)).toEqual(fallback)
		})
	})
})

/**
 * The plugins, which carry the same hazard as the sensors above and a sharper edge.
 *
 * Passing `plugins` **opts out of `defaultPreset`**, and four of the five the adapter lists are
 * listed purely to keep them: drop `AutoScroller`, `Cursor`, `Feedback` or `PreventSelection` and
 * auto-scrolling, the grab cursor, the dragged element's own movement or text-selection suppression
 * disappear with no error anywhere. A kit that lost one would look exactly like a kit that never had
 * it, which is why the array is asserted here rather than read off a diff.
 *
 * The second case is the one a reviewer cannot perform: it compares the array against the
 * **library's own preset**, so a future version that adds a sixth plugin fails here instead of
 * silently losing it at the next bump.
 */
describe('the plugins the adapter mounts', () => {
	/** The array the adapter passed the provider, mounted fresh. */
	function mountedPlugins(): readonly unknown[] {
		resetCapture()
		renderItem({ id: 'row-1', index: 0, axis: 'row', surface: 'table' })
		const { plugins } = capturedHandlers()
		if (!plugins) throw new Error('the adapter passed no plugins, so the preset is back')

		return plugins
	}

	/**
	 * A listed plugin's constructor: the class itself, or the one a configured descriptor wraps.
	 *
	 * Every member is a bare class today. It is written to see through a descriptor because the
	 * announcements seam in `dnd.tsx` turns `Accessibility` into one, and this comparison has to keep
	 * holding when it does.
	 */
	const constructorOf = (plugin: unknown): unknown =>
		typeof plugin === 'object' && plugin !== null && 'plugin' in plugin ? plugin.plugin : plugin

	it('lists all five, so opting out of the preset deletes none of them', () => {
		expect(mountedPlugins().map(constructorOf)).toEqual([
			Accessibility,
			AutoScroller,
			Cursor,
			Feedback,
			PreventSelection,
		])
	})

	/*
	 * Against the library's list rather than against the five named above — those two agree today,
	 * and this case is what notices the release where they stop agreeing. The failure names the
	 * missing plugin rather than reporting a length.
	 */
	it('accounts for every plugin the library’s own preset supplies', () => {
		const mounted = mountedPlugins().map(constructorOf)

		expect(defaultPreset.plugins.filter((plugin) => !mounted.includes(plugin))).toEqual([])
	})
})

/**
 * Announcing a drag: the half of the accessibility story the grid writes and this adapter speaks.
 *
 * The library's `Accessibility` plugin owns the live region and the hidden instructions node, and its
 * own callbacks receive ids and nothing else — so the sentences come from the grid, through
 * `DndProviderProps.announcements`, and this file's job is the translation: one of the library's
 * events in, one of the port's events plus `input` out, `undefined` for "say nothing".
 *
 * Driven through the **configured plugin descriptor** the adapter hands the provider, which is as far
 * as a unit test can reach: whether the returned string then lands in a `role="status"` region is the
 * library's work and the browser spec's to confirm. What is asserted here is every decision this
 * adapter makes — which port event each library event becomes, how `input` is derived, and the one
 * piece of ordering that a reader cannot see from the code alone.
 */
describe('announcing a drag', () => {
	const GROUP = 'row:table'
	const sortableId = (id: string) => `${GROUP}:${id}`

	/** A registry whose order is the array's order, all of it in one group. */
	const orderOf = (ids: string[]): RenderingManager => ({
		registry: { droppables: ids.map((id, index) => ({ id: sortableId(id), sortable: { index, group: GROUP } })) },
		renderer: { rendering: Promise.resolve() },
	})

	/** A keyboard activator, which is what makes a drag one the grid narrates. */
	const KEYBOARD_ACTIVATOR = { key: 'ArrowDown' } as unknown as Event

	/** And a mouse one, which is what makes a drag the plugin's listener leaves alone. */
	const POINTER_ACTIVATOR = { pointerType: 'mouse' } as unknown as Event

	const hover = (sourceId: string, targetId: string): SortableDragOverEvent => ({
		operation: {
			source: { id: sortableId(sourceId), type: GROUP },
			target: { id: sortableId(targetId), type: GROUP },
			activatorEvent: KEYBOARD_ACTIVATOR,
		},
		preventDefault: () => {},
	})

	/** A release, with the source as its own target — what the library reports after a displacement. */
	const release = (sourceId: string, overrides: Partial<SortableDragEndEvent> = {}): SortableDragEndEvent => ({
		canceled: false,
		operation: {
			source: {
				id: sortableId(sourceId),
				type: GROUP,
				index: 2,
				sortable: { index: 2, initialIndex: 0, group: GROUP },
			},
			target: { id: sortableId(sourceId), type: GROUP },
			activatorEvent: KEYBOARD_ACTIVATOR,
		},
		...overrides,
	})

	/**
	 * A bag that writes down every call in order, beside whatever the grid's own `onDrop` writes.
	 *
	 * The sentences name the port fields they were given, so a case can tell *which* event reached
	 * *which* callback rather than only that something was said.
	 */
	function bagOf(log: string[]): DndAnnouncements {
		return {
			instructions: 'Press space to pick up.',
			dragStart: (event) => {
				log.push('announce dragStart')

				return `start ${event.axis}/${event.surface} ${event.sourceId} by ${event.input}`
			},
			dragOver: (event) => {
				log.push('announce dragOver')

				return `over ${event.targetId} by ${event.input}`
			},
			dragEnd: (event) => {
				log.push('announce dragEnd')

				return `end ${event.sourceId} onto ${event.targetId} by ${event.input}`
			},
			dragCancel: (event) => {
				log.push('announce dragCancel')

				return `cancel ${event.sourceId} by ${event.input}`
			},
		}
	}

	/** The library's announcement callbacks, as the adapter configured them. */
	type LibraryAnnouncements = {
		dragstart: (event: SortableDragStartEvent) => string | undefined
		dragover: (event: SortableDragOverEvent) => string | undefined
		dragend: (event: SortableDragEndEvent) => string | undefined
	}

	/**
	 * One provider, with the grid's commit and its announcements writing into **one** log.
	 *
	 * The shared array is the point rather than a convenience: the only way to assert that the commit
	 * happens before the sentence is to have both record themselves in the same order.
	 */
	function mount(log: string[], announcements?: DndAnnouncements) {
		const drops: DndDropEvent[] = []
		resetCapture()
		render(
			<adapter.Provider
				onDrop={(event) => {
					drops.push(event)
					log.push('commit')
				}}
				canDrop={() => true}
				{...(announcements ? { announcements } : {})}
			>
				<div />
			</adapter.Provider>,
		)

		return { props: capturedHandlers(), log, drops }
	}

	/**
	 * The options the adapter passed `Accessibility.configure`.
	 *
	 * Reached by finding the one descriptor in the plugins array, which is also what proves the plugin
	 * was configured at all rather than listed bare.
	 */
	function configuredOptions(plugins: readonly unknown[] | undefined): {
		announcements: LibraryAnnouncements
		screenReaderInstructions: { draggable: string }
	} {
		const descriptor = plugins?.find(
			(plugin): plugin is { plugin: unknown; options: unknown } =>
				typeof plugin === 'object' && plugin !== null && 'plugin' in plugin,
		)
		if (!descriptor) throw new Error('the adapter listed no configured plugin')
		expect(descriptor.plugin).toBe(Accessibility)

		return descriptor.options as {
			announcements: LibraryAnnouncements
			screenReaderInstructions: { draggable: string }
		}
	}

	/** A drag of `row-1` past two neighbours, left held: what every `dragend` case starts from. */
	function heldItem(log: string[]) {
		const mounted = mount(log, bagOf(log))
		mounted.props.onDragStart?.(release('row-1'), orderOf(['row-1', 'row-4', 'row-5']))
		mounted.props.onDragOver?.(hover('row-1', 'row-4'), orderOf(['row-4', 'row-1', 'row-5']))
		mounted.props.onDragOver?.(hover('row-1', 'row-5'), orderOf(['row-4', 'row-5', 'row-1']))

		return mounted
	}

	it('leaves the plugin bare when the grid passes no announcements', () => {
		// The module constant, by identity — nothing to reassign, which is the point of it being one.
		const { props } = mount([])

		expect(props.plugins).toEqual([Accessibility, AutoScroller, Cursor, Feedback, PreventSelection])
	})

	it('configures the plugin and keeps the other four beside it', () => {
		// The trap this array exists for: configuring one plugin must not cost the four that came with
		// the preset, and the configured one is a descriptor rather than the class.
		const { props } = mount([], bagOf([]))

		expect(props.plugins?.slice(1)).toEqual([AutoScroller, Cursor, Feedback, PreventSelection])
		expect(configuredOptions(props.plugins).announcements.dragend).toBeTypeOf('function')
	})

	it('puts the catalogue’s instructions on the hidden description node', () => {
		// Replacing the library's own English paragraph about the space bar, which is the whole reason
		// `instructions` is a plain string rather than a callback.
		const { props } = mount([], bagOf([]))

		expect(configuredOptions(props.plugins).screenReaderInstructions).toEqual({
			draggable: 'Press space to pick up.',
		})
	})

	it('turns a pickup into the port’s source event', () => {
		const { props } = mount([], bagOf([]))

		expect(configuredOptions(props.plugins).announcements.dragstart(release('row-1'))).toBe(
			'start row/table row-1 by keyboard',
		)
	})

	it('turns a hover into the port’s drag-over event', () => {
		const { props } = mount([], bagOf([]))

		expect(configuredOptions(props.plugins).announcements.dragover(hover('row-1', 'row-4'))).toBe(
			'over row-4 by keyboard',
		)
	})

	/*
	 * `input` is what lets the grid narrate a keyboard drag and stay silent on a pointer one, so the
	 * derivation is asserted on its own. `instanceof KeyboardEvent` is deliberately not how it is
	 * read — the constructor is bound to one realm and every docs example renders inside an iframe —
	 * so what is checked is the `key` field, across a keyboard activator, a pointer one and none.
	 */
	it('derives the input from the activator, treating anything but a key as a pointer', () => {
		const { props } = mount([], bagOf([]))
		const { dragstart } = configuredOptions(props.plugins).announcements
		const withActivator = (activatorEvent: Event | null) => {
			const event = release('row-1')

			return dragstart({ operation: { ...event.operation, activatorEvent } })
		}

		expect(withActivator(KEYBOARD_ACTIVATOR)).toBe('start row/table row-1 by keyboard')
		expect(withActivator(POINTER_ACTIVATOR)).toBe('start row/table row-1 by pointer')
		expect(withActivator(null)).toBe('start row/table row-1 by pointer')
	})

	/**
	 * **What the plugin's `dragend` is for, now that it is all it is for.**
	 *
	 * It describes the drop and performs none of it: the sentence names the landing place the
	 * hovers recorded, and `onDrop` is the provider's handler's business alone. An earlier revision
	 * committed from here so the grid could read the moved table back; the grid derives a drop's
	 * position from a pickup snapshot instead, so the commit went and this is what remains.
	 */
	it('describes the drop, naming the landing place the hovers recorded', () => {
		const log: string[] = []
		const { props } = heldItem(log)

		const sentence = configuredOptions(props.plugins).announcements.dragend(release('row-1'))

		expect(sentence).toBe('end row-1 onto row-5 by keyboard')
		expect(log).toEqual(['announce dragEnd'])
	})

	/**
	 * **The guard against the commit coming back.** Both listeners read the same refs through the
	 * same resolver, and exactly one of them may act on the answer — so a re-introduced commit here
	 * shows up as a drop recorded before the provider's handler ever ran, rather than as a
	 * double-commit nobody notices.
	 */
	it('commits nothing of its own, leaving the provider’s handler the only committer', () => {
		const log: string[] = []
		const { props, drops } = heldItem(log)

		configuredOptions(props.plugins).announcements.dragend(release('row-1'))

		expect(drops).toEqual([])

		props.onDragEnd?.(release('row-1'))

		// One commit, and after the sentence — which is the order the library's own registration
		// produces and the adapter now depends on.
		expect(drops).toEqual([{ axis: 'row', surface: 'table', sourceId: 'row-1', targetId: 'row-5' }])
		expect(log).toEqual(['announce dragEnd', 'commit'])
	})

	/**
	 * **The order dependence, pinned by its failure rather than by its success.**
	 *
	 * The plugin's listener is registered first (inside `new DragDropManager`), so it reads the
	 * operation's refs while they still hold it. Driven the other way round — the provider's handler
	 * first, which clears them — the drop goes **unannounced** rather than announced wrongly, because
	 * `toDropEvent` refuses without an anchor. That is what makes the dependence safe to have, and it
	 * is the half a reader cannot infer from the registration order.
	 */
	it('says nothing about a drop the provider’s handler has already cleared', () => {
		const log: string[] = []
		const { props } = heldItem(log)

		props.onDragEnd?.(release('row-1'))
		const sentence = configuredOptions(props.plugins).announcements.dragend(release('row-1'))

		expect(sentence).toBeUndefined()
		expect(log).toEqual(['commit'])
	})

	it('describes a cancellation from the source alone, and commits nothing', () => {
		// `canceled` is the library's own flag, and the port splits it off as a source event because
		// nothing landed anywhere — there is no target to name.
		const log: string[] = []
		const { props, drops } = heldItem(log)

		const sentence = configuredOptions(props.plugins).announcements.dragend(release('row-1', { canceled: true }))

		expect(sentence).toBe('cancel row-1 by keyboard')
		expect(drops).toEqual([])
	})

	it('says nothing about a drag it could not read', () => {
		// A `type` this adapter never wrote: another provider in the tree, or a shape a future version
		// hands over. The refusal is the same one `toDragOverEvent` makes, and silence is the right
		// answer rather than a sentence about an id the grid does not know.
		const { props } = mount([], bagOf([]))
		const { dragstart } = configuredOptions(props.plugins).announcements

		expect(dragstart({ operation: { source: { id: 'trash:1', type: 'trash' } } })).toBeUndefined()
		expect(dragstart({ operation: { source: null } })).toBeUndefined()
	})
})
