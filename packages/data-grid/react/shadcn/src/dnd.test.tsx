import { useSortable } from '@dnd-kit/react/sortable'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { adapter, AnchorSide, hasTravelled, toDragAnchor, toDragOverEvent, toDropEvent } from './dnd'

import type { DragAnchor, SortableDragEndEvent, SortableDragOverEvent, SortableManager } from './dnd'
import type * as DndKitModule from '@dnd-kit/react'
import type * as SortableModule from '@dnd-kit/react/sortable'
import type { DndDragOverEvent, DndDropEvent, SortableItemHandle } from '@ez-kit/data-grid-react'

/**
 * The handlers the adapter hands dnd-kit's provider, as this file drives them.
 *
 * Declared structurally, and reached by a cast, for the reason the adapter's own `SortableDragEndEvent`
 * is: the library's handler types are generic over four parameters whose arguments live in
 * `@dnd-kit/abstract`, a transitive dependency this package does not declare. The adapter casts in the
 * same direction at the same boundary.
 */
type CapturedHandlers = {
	onDragStart?: (event: SortableDragEndEvent, manager: SortableManager) => void
	onDragOver?: (event: SortableDragOverEvent, manager: SortableManager) => void
	/**
	 * The manager is **optional**, and that is the point of the last case below: the adapter no longer
	 * reads a group's order at release, so a case can hand it the stale one a re-render leaves behind
	 * and assert that it changes nothing.
	 */
	onDragEnd?: (event: SortableDragEndEvent, manager?: SortableManager) => void
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
	const orderOf = (ids: string[]): SortableManager => ({
		registry: { droppables: ids.map((id, index) => ({ id: sortableId(id), sortable: { index, group: GROUP } })) },
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
		resetCapture()
		render(
			<adapter.Provider
				onDrop={(event) => drops.push(event)}
				canDrop={canDrop}
			>
				<div />
			</adapter.Provider>,
		)

		return { props: capturedHandlers(), drops }
	}

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
