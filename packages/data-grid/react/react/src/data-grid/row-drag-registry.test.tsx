import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import {
	RowDragRegistryProvider,
	useActiveDraggingRow,
	useDisplaceRow,
	usePublishRenderedRows,
	useRenderedRowIds,
	useReportActiveDraggingRow,
	useRowDragProjection,
} from './row-drag-registry'

import type { ReactNode } from 'react'

/** Publishes a list the way a body does — during render, above the readers. */
function Publisher({ ids }: { ids: readonly string[] | null }) {
	usePublishRenderedRows(ids)
	return null
}

/** Reads the list the way a row does — during render, below the publisher. */
function ListProbe() {
	const published = useRenderedRowIds()
	return <span data-testid='list'>{published === null ? 'null' : published.join(',')}</span>
}

function Reporter({ rowId, isDragging }: { rowId: string; isDragging: boolean }) {
	useReportActiveDraggingRow(rowId, isDragging)
	return null
}

function ActiveProbe() {
	const active = useActiveDraggingRow()
	return <span data-testid='active'>{active ?? 'none'}</span>
}

const inRegistry = (children: ReactNode) => <RowDragRegistryProvider>{children}</RowDragRegistryProvider>

const list = () => screen.getByTestId('list').textContent
const active = () => screen.getByTestId('active').textContent

describe('the published rendered-row list', () => {
	it('is null when no body has published one', () => {
		// Arrange / Act
		render(inRegistry(<ListProbe />))

		// Assert — `null` is the instruction to derive, which is what both non-virtual bodies want.
		expect(list()).toBe('null')
	})

	it('is what the body published, in the order it published it', () => {
		render(
			inRegistry(
				<>
					<Publisher ids={['c', 'a', 'b']} />
					<ListProbe />
				</>,
			),
		)

		expect(list()).toBe('c,a,b')
	})

	it('is the latest window, not the one the registry was first given', () => {
		/*
		 * The window scrolls, as it does under a drag's auto-scroll, and every reader must see the new
		 * one — rows re-register their positions from it on that same render.
		 *
		 * There used to be a second reader, a stable `useRenderedRowIdsReader()` that `GridDndProvider`
		 * called at drop time so its memoised closure could not resolve a drop against a stale window.
		 * It is gone with the landing index it served: a drop names its target by id, so the window has
		 * one reader and no second side to fall out of step with. `DndDropEvent` has the account.
		 */
		const { rerender } = render(
			inRegistry(
				<>
					<Publisher ids={['a', 'b']} />
					<ListProbe />
				</>,
			),
		)
		expect(list()).toBe('a,b')

		rerender(
			inRegistry(
				<>
					<Publisher ids={['c', 'd']} />
					<ListProbe />
				</>,
			),
		)

		expect(list()).toBe('c,d')
	})

	it('is cleared by a later null — the grid ceasing to be virtualized', () => {
		// `body.tsx` publishes `null` for exactly this: a virtualized body's last window must not
		// outlive it, or every row of the non-virtual body that replaced it reads a stale list.
		const { rerender } = render(
			inRegistry(
				<>
					<Publisher ids={['a', 'b']} />
					<ListProbe />
				</>,
			),
		)
		expect(list()).toBe('a,b')

		rerender(
			inRegistry(
				<>
					<Publisher ids={null} />
					<ListProbe />
				</>,
			),
		)

		expect(list()).toBe('null')
	})
})

describe('the active dragging row', () => {
	it('is null while nothing is being dragged', () => {
		render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging={false}
					/>
					<ActiveProbe />
				</>,
			),
		)

		expect(active()).toBe('none')
	})

	it('is recorded while a row reports itself dragging', () => {
		render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)

		expect(active()).toBe('a')
	})

	it('is cleared when the row’s own isDragging goes false', () => {
		/*
		 * This is the whole cancellation story. A cancelled drag fires no `onDrop`, so a record
		 * cleared on commit would leak — but the row is still mounted *because* it is recorded, so
		 * its own flag falling is enough. That is why the port grew no `onDragEnd`.
		 */
		const { rerender } = render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)
		expect(active()).toBe('a')

		rerender(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging={false}
					/>
					<ActiveProbe />
				</>,
			),
		)

		expect(active()).toBe('none')
	})

	it('is cleared when the row unmounts', () => {
		const { rerender } = render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)
		expect(active()).toBe('a')

		rerender(inRegistry(<ActiveProbe />))

		expect(active()).toBe('none')
	})

	it('is handed over to a second row rather than cleared by the first standing down', () => {
		// Both effects re-run in the same commit, in either order, and the record must end on `b`
		// whichever way round React runs them — which is what the "only ever clear our own record"
		// guard buys.
		const { rerender } = render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging
					/>
					<Reporter
						rowId='b'
						isDragging={false}
					/>
					<ActiveProbe />
				</>,
			),
		)
		expect(active()).toBe('a')

		rerender(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging={false}
					/>
					<Reporter
						rowId='b'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)

		expect(active()).toBe('b')
	})

	it('survives the first row unmounting once a second row is the active one', () => {
		// The unmount cleanup is the other half of the same guard: a row torn down after another
		// took over must not take the live record with it.
		const { rerender } = render(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)
		expect(active()).toBe('a')

		rerender(
			inRegistry(
				<>
					<Reporter
						rowId='a'
						isDragging={false}
					/>
					<Reporter
						rowId='b'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)
		expect(active()).toBe('b')

		rerender(
			inRegistry(
				<>
					<Reporter
						rowId='b'
						isDragging
					/>
					<ActiveProbe />
				</>,
			),
		)

		expect(active()).toBe('b')
	})

	it('is null with no registry above, and reporting into none is a no-op', () => {
		render(
			<>
				<Reporter
					rowId='a'
					isDragging
				/>
				<ActiveProbe />
			</>,
		)

		expect(active()).toBe('none')
	})
})

describe('the drag projection', () => {
	const ORDER = ['a', 'b', 'c', 'd']

	/** Exposes the writer to the test, the way `GridDndProvider` holds it. */
	const writer: { displace: ((order: readonly string[], sourceId: string, targetId: string) => void) | null } = {
		displace: null,
	}
	function Displacer() {
		const displaceRow = useDisplaceRow()
		useEffect(() => {
			writer.displace = displaceRow
		}, [displaceRow])
		return null
	}
	const displace = (order: readonly string[], sourceId: string, targetId: string) => {
		if (writer.displace === null) throw new Error('the writer is not mounted')
		writer.displace(order, sourceId, targetId)
	}

	function ProjectionProbe() {
		const projection = useRowDragProjection()
		return (
			<span data-testid='projection'>
				{projection === null ? 'none' : `${projection.sourceId}:${projection.placement}:${projection.targetId}`}
			</span>
		)
	}

	const projection = () => screen.getByTestId('projection').textContent
	const tree = (isDragging: boolean) =>
		inRegistry(
			<>
				<Reporter
					rowId='a'
					isDragging={isDragging}
				/>
				<Displacer />
				<ProjectionProbe />
			</>,
		)

	it('is null until the held row is displaced, then records each step', () => {
		render(tree(true))
		expect(projection()).toBe('none')

		act(() => {
			displace(ORDER, 'a', 'c')
		})
		expect(projection()).toBe('a:after:c')

		// Back over `b`, which the held row is now below — so in front of it, not behind.
		act(() => {
			displace(ORDER, 'a', 'b')
		})
		expect(projection()).toBe('a:before:b')
	})

	it('is cleared when the dragged row stops dragging — a drop and a cancel alike', () => {
		const { rerender } = render(tree(true))
		act(() => {
			displace(ORDER, 'a', 'c')
		})
		expect(projection()).toBe('a:after:c')

		rerender(tree(false))

		expect(projection()).toBe('none')
	})

	it('keeps a displacement that reached the registry before the row reported itself active', () => {
		// The adapter's first hover can arrive before the row's activation effect has run; it belongs to
		// the same gesture and must not be thrown away when the activation lands.
		const { rerender } = render(tree(false))
		act(() => {
			displace(ORDER, 'a', 'c')
		})

		rerender(tree(true))

		expect(projection()).toBe('a:after:c')
	})
})
