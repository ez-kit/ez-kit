import { useSortable } from '@dnd-kit/react/sortable'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { adapter, toDragOverEvent, toDropEvent } from './dnd'

import type { SortableDragEndEvent, SortableDragOverEvent } from './dnd'
import type * as SortableModule from '@dnd-kit/react/sortable'
import type { SortableItemHandle } from '@ez-kit/data-grid-react'

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
			 * `index` differs from `initialIndex` — an item that actually travelled. Under optimistic
			 * sorting the *target* is the source itself by the time the drop lands, which is why the
			 * fixture's target carries the source's own id: that is what the library really reports,
			 * and reading the target's id was the defect this contract replaced.
			 */
			source: { id: 'row-1', type: 'row', index: 3, sortable: { index: 3, initialIndex: 0 } },
			target: { id: 'row-1', type: 'row' },
		},
		...overrides,
	}
}

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
		const seen = renderItem({ id: 'row-1', index: 0, axis: 'row' })

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
	it('maps the spec onto the sortable input, with the axis on type, accept and group', () => {
		renderItem({ id: 'col-1', index: 2, axis: 'column', disabled: true })

		expect(useSortableSpy.mock.calls[0]?.[0]).toEqual({
			id: 'col-1',
			index: 2,
			type: 'column',
			accept: 'column',
			group: 'column',
			disabled: true,
		})
	})

	/*
	 * `group` has its own case because it is the one member whose absence is invisible in a grid
	 * with a single axis — which every grid was until header dragging existed. It partitions the
	 * index space `OptimisticSortingPlugin` asserts is dense per group; unset, rows and columns
	 * share one space and both axes go dead. See the comment on it in `dnd.tsx`.
	 */
	it('groups an item by its axis, so the two orders keep separate index spaces', () => {
		renderItem({ id: 'row-1', index: 0, axis: 'row' })
		expect(useSortableSpy.mock.calls[0]?.[0]).toMatchObject({ group: 'row' })
	})

	it('omits disabled rather than passing it as undefined', () => {
		// `exactOptionalPropertyTypes`: omitted and `undefined` are different things, and dnd-kit's
		// own types are not written under that flag. The conditional spread is what keeps them apart.
		renderItem({ id: 'row-1', index: 0, axis: 'row' })

		expect(useSortableSpy.mock.calls[0]?.[0]).not.toHaveProperty('disabled')
	})
})

describe('translating a completed drag', () => {
	it('reports where the item landed, on the row axis', () => {
		// Arrange
		const event = dragEnd()

		// Act
		const drop = toDropEvent(event)

		// Assert — the landing index, not the target's id. The grid resolves the row living there.
		expect(drop).toEqual({ axis: 'row', sourceId: 'row-1', targetIndex: 3 })
	})

	it('reports the column axis from the source type', () => {
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'name', type: 'column', index: 0, sortable: { index: 0, initialIndex: 2 } },
					target: { id: 'name', type: 'column' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'column', sourceId: 'name', targetIndex: 0 })
	})

	it('stringifies a numeric id', () => {
		// dnd-kit's `UniqueIdentifier` is `string | number`; the port's ids are strings.
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 1, type: 'row', index: 2, sortable: { index: 2, initialIndex: 0 } },
					target: { id: 1, type: 'row' },
				},
			}),
		)

		expect(drop).toEqual({ axis: 'row', sourceId: '1', targetIndex: 2 })
	})

	it('refuses an aborted drag', () => {
		// Escape, or a programmatic cancel. A release over nothing is the *next* case — dnd-kit
		// reports that one as `canceled: false` with a null target.
		expect(toDropEvent(dragEnd({ canceled: true }))).toBeNull()
	})

	it('refuses a drop with no target', () => {
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'row-1', type: 'row', index: 3, sortable: { index: 3, initialIndex: 0 } },
					target: null,
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a drag that ended where it began', () => {
		// Nothing moved, so committing would fire `onChange` with a no-op and break the "exactly one
		// per drag" promise from the other side.
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'row-1', type: 'row', index: 2, sortable: { index: 2, initialIndex: 2 } },
					target: { id: 'row-1', type: 'row' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a source with no sortable behind it — a plain draggable', () => {
		const drop = toDropEvent(
			dragEnd({ operation: { source: { id: 'row-1', type: 'row' }, target: { id: 'row-1', type: 'row' } } }),
		)

		expect(drop).toBeNull()
	})

	it('refuses a type this adapter did not set', () => {
		// Another DragDropProvider in the tree, or a draggable of some other kind. Not ours.
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'x', type: 'something-else', index: 1, sortable: { index: 1, initialIndex: 0 } },
					target: { id: 'x', type: 'something-else' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a target of a different kind', () => {
		// `accept` gates collisions, so a row cannot reach a column today. It cannot gate a droppable
		// registered without an `accept` — a trash zone, a group header — and such a drop would
		// otherwise commit against a foreign entity.
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'row-1', type: 'row', index: 3, sortable: { index: 3, initialIndex: 0 } },
					target: { id: 'trash' },
				},
			}),
		)

		expect(drop).toBeNull()
	})

	it('refuses a source with no type at all', () => {
		const drop = toDropEvent(
			dragEnd({
				operation: {
					source: { id: 'x', index: 1, sortable: { index: 1, initialIndex: 0 } },
					target: { id: 'y', type: 'row' },
				},
			}),
		)

		expect(drop).toBeNull()
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
		expect(toDragOverEvent(dragOver({ id: 'name', type: 'column' }, { id: 'salary', type: 'column' }))).toEqual({
			axis: 'column',
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
		expect(toDragOverEvent(dragOver({ id: 'name', type: 'column' }, { id: 'name', type: 'column' }))).toBeNull()
	})

	it('asks nothing when either end is missing', () => {
		expect(toDragOverEvent(dragOver(null, { id: 'name', type: 'column' }))).toBeNull()
		expect(toDragOverEvent(dragOver({ id: 'name', type: 'column' }, null))).toBeNull()
	})

	it('asks nothing about a type this adapter did not set, on either end', () => {
		expect(toDragOverEvent(dragOver({ id: 'x', type: 'trash' }, { id: 'y', type: 'trash' }))).toBeNull()
		expect(toDragOverEvent(dragOver({ id: 'name', type: 'column' }, { id: '1', type: 'row' }))).toBeNull()
	})
})
