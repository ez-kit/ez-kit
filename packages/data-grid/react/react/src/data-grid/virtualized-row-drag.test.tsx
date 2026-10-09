import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { TEST_COLUMNS, TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { usePublishRenderedRows, useRenderedRowIds } from './row-drag-registry'
import { VirtualProvider } from './virtual-context'

import type { TestRow } from '../test-utils'
import type { DndAdapter, DndDropEvent, DragSpec, SortableItemHandle } from './dnd'
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual'
import type { ReactNode } from 'react'

const ROW_HEIGHT = 40

/**
 * A stand-in for a kit's adapter that a test can drive, as in `row-drag.test.tsx` — plus a reader
 * for a row's **latest** spec, because these cases re-render and a row registers once per render.
 *
 * No pointer is simulated: jsdom reports every element as zero-sized, so a gesture here would test
 * jsdom's geometry stub rather than the drag. What is testable without a browser is which index each
 * row registers at — the one place a position still matters, and exactly where a virtualized drag
 * fails, silently, when the index space has a gap — and which row a drop's `targetId` commits onto.
 */
function makeDrivableAdapter(draggingId?: string) {
	const specs: DragSpec[] = []
	const drops: ((event: DndDropEvent) => void)[] = []
	const inert = { ref: () => {}, handleRef: () => {} }

	const adapter: DndAdapter = {
		Provider: ({ onDrop, children }) => {
			drops.push(onDrop)
			return <>{children}</>
		},
		useSortableItem: (spec): SortableItemHandle => {
			specs.push(spec)
			return { ...inert, isDragging: spec.id === draggingId }
		},
	}

	return {
		adapter,
		/** The index this row registered on the most recent render. */
		indexOf: (id: string) => specs.filter((spec) => spec.axis === 'row' && spec.id === id).at(-1)?.index,
		/**
		 * Fires the **latest** `onDrop`, not every one the provider has handed over.
		 *
		 * These cases re-render — that is how a window scrolls — and the provider hands over a fresh
		 * closure each time, while a real adapter holds only the current one. Firing them all would
		 * commit a drop once per render, which says nothing about the grid.
		 */
		fireDrop: (event: DndDropEvent) => {
			drops.at(-1)?.(event)
		},
	}
}

/**
 * A virtualizer whose window a test states outright.
 *
 * The real one is driven by layout, and jsdom has none — every element measures zero, so
 * `useVirtualizer` would hand back whatever window a zero-height scrollport implies and a test could
 * not scroll it. `VirtualProvider` takes the virtualizer as a prop, so a stub mounted around
 * `<DataGrid.Body>` puts the window under the test's control while `VirtualBody` runs for real.
 *
 * `measurementsCache` is full-length on purpose: the virtualizer builds it for every row from
 * `estimateSize`, which is what lets a held row render at the offset it actually occupies.
 */
function makeVirtualizer(count: number, window: number[]) {
	const measurements: VirtualItem[] = Array.from({ length: count }, (_, index) => ({
		index,
		key: index,
		start: index * ROW_HEIGHT,
		end: (index + 1) * ROW_HEIGHT,
		size: ROW_HEIGHT,
		lane: 0,
	}))

	return {
		getVirtualItems: () => window.flatMap((index) => (measurements[index] ? [measurements[index]] : [])),
		getTotalSize: () => count * ROW_HEIGHT,
		measurementsCache: measurements,
	} as unknown as Virtualizer<HTMLDivElement, Element>
}

const rowsOf = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-row-id]')].map((row) => row.getAttribute('data-row-id'))

/** Six rows, so a window can be narrower than the model in both directions. */
const SIX_ROWS: TestRow[] = Array.from({ length: 6 }, (_, index) => ({
	id: index + 1,
	name: `Row ${String(index + 1)}`,
	age: 20 + index,
}))

/**
 * The published list, captured so a case can assert what the body declared it was rendering.
 *
 * Mounted **below** the body on purpose: `VirtualBody` publishes during its own render, so a probe
 * above it would read the previous window. Handed out in an effect into a holder object rather than
 * assigned during render — writing to an outer binding mid-render is a side effect, which is the
 * arrangement `renderGrid` in `test-utils` already uses. Effects flush inside `render`'s `act`, so
 * the case sees it.
 *
 * It used to capture the stable event-time *reader* instead, because the grid resolved a drop's
 * landing index through it after the last render. Nothing reads the list at event time now — a drop
 * names its target by id — so a render-time read is the whole of what there is to assert.
 */
const published: { ids: readonly string[] | null } = { ids: null }
function PublishedProbe() {
	const ids = useRenderedRowIds()
	useEffect(() => {
		published.ids = ids
	})
	return null
}

afterEach(() => {
	published.ids = null
})

function renderVirtualGrid(
	adapter: DndAdapter,
	virtualizer: Virtualizer<HTMLDivElement, Element>,
	config: Record<string, unknown> = {},
) {
	const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
	const tree = (current: Virtualizer<HTMLDivElement, Element>): ReactNode => (
		<BoundDataGrid
			features={TEST_FEATURES}
			data={SIX_ROWS}
			columns={TEST_COLUMNS}
			ordering={{ row: true }}
			{...config}
		>
			<VirtualProvider rowVirtualizer={current}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
			<PublishedProbe />
		</BoundDataGrid>
	)
	const result = render(tree(virtualizer))

	return {
		container: result.container,
		/** Scroll the window, as a drag's auto-scroll does mid-gesture. */
		setWindow: (next: Virtualizer<HTMLDivElement, Element>) => {
			result.rerender(tree(next))
		},
	}
}

describe('what a virtualized body publishes', () => {
	it('is the window, and the rows register dense indices across it', () => {
		// Arrange / Act — rows 3..5 of six.
		const { adapter, indexOf } = makeDrivableAdapter()
		const { container } = renderVirtualGrid(adapter, makeVirtualizer(6, [2, 3, 4]))

		// Assert — the published list is what is in the DOM, and the indices are `0..n-1` over it
		// rather than the whole-model `2..4` that killed the axis on the first frame.
		expect(rowsOf(container)).toEqual(['3', '4', '5'])
		expect(published.ids).toEqual(['3', '4', '5'])
		expect(['3', '4', '5'].map(indexOf)).toEqual([0, 1, 2])
	})

	it('commits the id the drop names, whatever the window was', () => {
		/*
		 * The invariant that replaced "one list, two readers". A drop carries two ids, so the window
		 * is not consulted at all on the commit side: the grid hands both straight to `dropRow`, which
		 * resolves them against the table's own model.
		 *
		 * The drop is deliberately onto a row **outside** the published window — a place a landing
		 * index could not even name, since the index space is the window. That is the whole gain: the
		 * window moving mid-drag can no longer shift where a drop lands, which is how auto-scroll made
		 * the index form commit three or four rows past the one released on.
		 */
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderVirtualGrid(adapter, makeVirtualizer(6, [2, 3, 4]), { ordering: { row: { onChange } } })
		expect(published.ids).toEqual(['3', '4', '5'])

		fireDrop({ axis: 'row', surface: 'table', sourceId: '3', targetId: '6' })

		expect(onChange).toHaveBeenCalledOnce()
		expect(onChange.mock.calls[0]?.[0]).toMatchObject({ rowId: '3', targetRowId: '6' })
	})

	it('refuses a drop onto the source itself', () => {
		// The one guard left on this path. An adapter reports no drop in that case; the grid does not
		// rely on it, because a self-drop is a no-op `onChange` either way.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderVirtualGrid(adapter, makeVirtualizer(6, [2, 3, 4]), { ordering: { row: { onChange } } })

		fireDrop({ axis: 'row', surface: 'table', sourceId: '3', targetId: '3' })

		expect(onChange).not.toHaveBeenCalled()
	})
})

describe('a row held through a drag', () => {
	it('is dropped from the window when nothing is being dragged', () => {
		// The control for the case below: without a drag in flight the body renders the window and
		// nothing else, so the extra row there is the hold rather than an off-by-one.
		const { adapter } = makeDrivableAdapter()
		const { container } = renderVirtualGrid(adapter, makeVirtualizer(6, [0, 1]))

		expect(rowsOf(container)).toEqual(['1', '2'])
	})

	it('stays mounted once the window has scrolled past it', () => {
		/*
		 * The defect this exists for. Let the dragged row unmount and its sortable unregisters
		 * mid-gesture, leaving a hole in an index space the library requires to be exactly `0..n-1`.
		 * Nothing in the DOM shows it, because from then on the element under the pointer is
		 * dnd-kit's own clone rather than React's row — so the drag looks alive while the drop
		 * resolves the source to `-1`, which `Math.max` clamps to `0`: the row silently lands at the
		 * top of the grid.
		 */
		const { adapter, indexOf } = makeDrivableAdapter('1')
		const { container, setWindow } = renderVirtualGrid(adapter, makeVirtualizer(6, [0, 1, 2]))
		expect(rowsOf(container)).toEqual(['1', '2', '3'])

		// Act — the window scrolls off the dragged row.
		setWindow(makeVirtualizer(6, [3, 4]))

		// Assert — still rendered, still published, and the space is still dense.
		expect(rowsOf(container)).toEqual(['1', '4', '5'])
		expect(published.ids).toEqual(['1', '4', '5'])
		expect(['1', '4', '5'].map(indexOf)).toEqual([0, 1, 2])
	})

	it('sits at its index-sorted place, not appended', () => {
		// Appended, the held row would be published last while being drawn first, so every row in
		// the window would resolve a drop onto its neighbour. The row is dragged from index 0 and
		// the window is at the end of the model, which is the arrangement that tells the two apart.
		const { adapter, indexOf } = makeDrivableAdapter('1')
		const { container, setWindow } = renderVirtualGrid(adapter, makeVirtualizer(6, [0, 4, 5]))
		setWindow(makeVirtualizer(6, [4, 5]))

		expect(rowsOf(container)).toEqual(['1', '5', '6'])
		expect(indexOf('1')).toBe(0)
		expect(indexOf('5')).toBe(1)
		expect(indexOf('6')).toBe(2)
	})

	it('commits for a row the window scrolled away from, by id', () => {
		/*
		 * The held row is dragged out of the window and released on a row at the far end. Under the
		 * index form this was the case that had to be resolved through the published list *including*
		 * the held row, and the case auto-scroll then broke anyway. By id there is nothing to resolve:
		 * the source is a row the window no longer contains and the commit does not care.
		 */
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter('1')
		const { setWindow } = renderVirtualGrid(adapter, makeVirtualizer(6, [0, 4, 5]), {
			ordering: { row: { onChange } },
		})
		setWindow(makeVirtualizer(6, [4, 5]))
		expect(published.ids).toEqual(['1', '5', '6'])

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '6' })

		expect(onChange).toHaveBeenCalledOnce()
		expect(onChange.mock.calls[0]?.[0]).toMatchObject({ rowId: '1', targetRowId: '6' })
	})

	it('appears exactly once while it is both in the window and held', () => {
		// One id, one registration. Rendered twice, the id would be a duplicate in the index space,
		// which kills the axis exactly as a gap does — and React would warn about the key besides.
		const { adapter, indexOf } = makeDrivableAdapter('2')
		const { container } = renderVirtualGrid(adapter, makeVirtualizer(6, [0, 1, 2]))

		expect(rowsOf(container)).toEqual(['1', '2', '3'])
		expect(container.querySelectorAll('[data-row-id="2"]')).toHaveLength(1)
		expect(['1', '2', '3'].map(indexOf)).toEqual([0, 1, 2])
	})

	it('is let go when the drag ends, with no commit of its own', () => {
		// A cancelled drag fires no `onDrop`; the row's own `isDragging` falling is what releases it.
		// Modelled by rebinding the grid to an adapter that reports nothing as dragging.
		const held = makeDrivableAdapter('1')
		const { container, setWindow } = renderVirtualGrid(held.adapter, makeVirtualizer(6, [0, 1, 2]))
		setWindow(makeVirtualizer(6, [3, 4]))
		expect(rowsOf(container)).toEqual(['1', '4', '5'])

		const idle = makeDrivableAdapter()
		const { container: after } = renderVirtualGrid(idle.adapter, makeVirtualizer(6, [3, 4]))

		expect(rowsOf(after)).toEqual(['4', '5'])
	})
})

describe('a virtualized body with pinned rows', () => {
	it('publishes the three bands around the window, densely', () => {
		// The published list is the DOM order — top band, then the window, then the bottom band — so
		// a drag near a bottom-pinned row displaces the row beside it rather than one mid-table.
		const { adapter, indexOf } = makeDrivableAdapter()
		const { container } = renderVirtualGrid(adapter, makeVirtualizer(4, [1, 2]), {
			pinning: { row: true },
			initialState: { rowPinning: { top: ['1'], bottom: ['6'] } },
		})

		expect(rowsOf(container)).toEqual(['1', '3', '4', '6'])
		expect(published.ids).toEqual(['1', '3', '4', '6'])
		expect(['1', '3', '4', '6'].map(indexOf)).toEqual([0, 1, 2, 3])
	})
})

describe('the non-virtual body', () => {
	it('publishes null, so every row derives its own index', () => {
		// Not an omission: that body renders exactly the derivation, so publishing it would copy an
		// array per render in order to compare it with itself.
		const { adapter, indexOf } = makeDrivableAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={SIX_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
				<PublishedProbe />
			</BoundDataGrid>,
		)

		expect(published.ids).toBeNull()
		expect(['1', '2', '3', '4', '5', '6'].map(indexOf)).toEqual([0, 1, 2, 3, 4, 5])
	})
})

describe('a published list that omits a rendered row', () => {
	/** Publishes a list of the test's choosing, above the rows, the way a body does. */
	function Publisher({ ids }: { ids: readonly string[] }) {
		usePublishRenderedRows(ids)
		return null
	}

	/**
	 * The warning is reported once per row id through a **module-level** set in `row.tsx`, which
	 * outlives a test — so every case here gets ids of its own. Sharing them would let a case pass
	 * because an earlier one had already used up the report.
	 */
	const rowsWithIds = (ids: number[]): TestRow[] => ids.map((id) => ({ id, name: `Row ${String(id)}`, age: 30 }))

	function renderWithPublishedList(data: TestRow[], ids: readonly string[]) {
		const { adapter } = makeDrivableAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		const tree = (
			<BoundDataGrid
				features={TEST_FEATURES}
				data={data}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			>
				<DataGrid.Table>
					<DataGrid.Body>
						{({ rows }) => (
							<>
								<Publisher ids={ids} />
								{rows.map((row) => (
									<DataGrid.Row
										key={row.id}
										row={row}
									/>
								))}
							</>
						)}
					</DataGrid.Body>
				</DataGrid.Table>
			</BoundDataGrid>
		)
		const result = render(tree)

		return {
			rerender: () => {
				result.rerender(tree)
			},
		}
	}

	it('is reported in development, once per row id rather than once per render', () => {
		// Arrange
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

		// Act — only `101` is published, so the other two rendered rows have no position.
		const { rerender } = renderWithPublishedList(rowsWithIds([101, 102, 103]), ['101'])

		// Assert — one report each, naming the row.
		expect(errors).toHaveBeenCalledTimes(2)
		const reported = errors.mock.calls.map(([message]) => String(message))
		expect(reported.some((message) => message.includes('"102"'))).toBe(true)
		expect(reported.some((message) => message.includes('"103"'))).toBe(true)
		expect(reported.every((message) => message.includes('not in the list its body published'))).toBe(true)

		// Act — a second render of the same rows.
		rerender()

		// Assert — no repeat: the report is about the grid's shape, not about a frame.
		expect(errors).toHaveBeenCalledTimes(2)
		errors.mockRestore()
	})

	it('is silent when the list covers every rendered row', () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

		renderWithPublishedList(rowsWithIds([201, 202, 203]), ['201', '202', '203'])

		expect(errors).not.toHaveBeenCalled()
		errors.mockRestore()
	})
})
