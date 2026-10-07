import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { PaginationMode } from '../index'
import { TEST_COLUMNS, TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { DragAxis, DragSurface } from './dnd'
import { VirtualProvider } from './virtual-context'

import type { TestRow } from '../test-utils'
import type { DndAdapter, DndDragOverEvent, SortableItemHandle } from './dnd'
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual'

const ROW_HEIGHT = 40
const ROW_COUNT = 1_000
const TOTAL_SIZE = ROW_COUNT * ROW_HEIGHT

const DATA: TestRow[] = Array.from({ length: ROW_COUNT }, (_, index) => ({
	id: index + 1,
	name: `Row ${String(index + 1)}`,
	age: 20 + (index % 50),
}))

/**
 * The row the drag cases pick up, and the model index it sits at.
 *
 * The two are not the same number: no `getRowId` is given, so the core falls back to the record's
 * own `id`, which these records number from one. Row `'3'` is therefore index 2 — and the offset
 * that index implies is non-zero, which is what makes the held row's `transform` assertable at all.
 */
const HELD_ROW_ID = '3'
const HELD_ROW_INDEX = 2

/** How many rows every window in these cases spans. */
const WINDOW_COUNT = 5

/**
 * The window the downward-drag cases scroll **to**, and the row a late window has scrolled **past**.
 *
 * `HELD_BELOW_*` is the mirror image: a row picked up near the end of the model while the window
 * then scrolls back to the top, so the held row sits *below* the window rather than above it. Both
 * directions are needed to pin both pads — see `padsFor`.
 */
const SCROLLED_WINDOW_FIRST = 200
const HELD_BELOW_ROW_ID = '900'
const HELD_BELOW_ROW_INDEX = 899

/**
 * The two pads a window of {@link WINDOW_COUNT} rows at `firstIndex` must produce.
 *
 * Derived from the window rather than written out, so the pair cannot drift apart from the window
 * it describes: this is `resolveVirtualWindowPads`' own arithmetic — the first row's offset above,
 * and whatever is left below the last row's bottom edge.
 */
function padsFor(firstIndex: number) {
	return {
		paddingTop: `${String(firstIndex * ROW_HEIGHT)}px`,
		paddingBottom: `${String(TOTAL_SIZE - (firstIndex + WINDOW_COUNT) * ROW_HEIGHT)}px`,
	}
}

/** A window of `count` rows starting at `firstIndex`, the shape `getVirtualItems()` returns. */
function windowItems(firstIndex: number, count: number): VirtualItem[] {
	return Array.from({ length: count }, (_, offset) => {
		const index = firstIndex + offset
		return {
			index,
			key: index,
			start: index * ROW_HEIGHT,
			end: (index + 1) * ROW_HEIGHT,
			size: ROW_HEIGHT,
			lane: 0,
		}
	})
}

/**
 * A virtualizer whose window the test states outright, as in `virtualized-row-drag.test.tsx`.
 *
 * jsdom measures every element as zero, so the real `useVirtualizer` would hand back whatever
 * window a zero-height scrollport implies and nothing here would be assertable. `VirtualProvider`
 * takes the virtualizer as a prop, so a stub mounted inside the grid puts the window under the
 * test's control while `VirtualBody` runs for real.
 *
 * `measurementsCache` is full-length on purpose: the virtualizer builds it for every row from
 * `estimateSize`, and `VirtualBody` reads it by row index to hold a dragged row — which is the path
 * the three `renderWindowWithDrag` cases below drive, and the offset they assert the held row at.
 */
function stubVirtualizer(items: VirtualItem[]): Virtualizer<HTMLDivElement, Element> {
	return {
		getVirtualItems: () => items,
		getTotalSize: () => TOTAL_SIZE,
		measurementsCache: windowItems(0, ROW_COUNT),
	} as unknown as Virtualizer<HTMLDivElement, Element>
}

const { DataGrid: Grid } = createDataGrid({ components: testComponents })

/**
 * The provider goes **inside** the grid, around `<DataGrid.Table>`'s body.
 *
 * Mounted around the grid root instead, the stub is not the virtualizer `VirtualBody` reads — the
 * root installs its own — so the tbody comes out at the scrollport's jsdom height of zero and
 * every assertion here measures the wrong element.
 *
 * `pageSize` is the whole row count because `TEST_FEATURES` registers `paginationFeature`, which
 * slices the model to `DEFAULT_PAGE_SIZE` (10) — and `pagination={false}` does not take that back.
 * A window at index 10 then finds no row behind it and the body renders empty, which is a fixture
 * artefact rather than anything about the geometry under test.
 */
function renderWindow(items: VirtualItem[]) {
	return render(
		<Grid
			features={TEST_FEATURES}
			data={DATA}
			columns={TEST_COLUMNS}
			pagination={{ pageSize: ROW_COUNT }}
		>
			<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
		</Grid>,
	)
}

/**
 * `renderWindow` with infinite scroll active, so the loader row renders.
 *
 * `pagination` rather than a top-level `infinite` option: the config lives at
 * `pagination.mode: 'infinite'` with `hasNextPage` / `onLoadMore` beside it, and
 * `normalizeInfinite` returns nothing for any other mode — so a grid configured any other way
 * renders no loader at all and the cases below would assert against `null`.
 *
 * `pageSize` stays for the reason `renderWindow` gives, and infinite mode does not excuse it: the
 * mode means to show every accumulated row, but `TEST_FEATURES` registers `paginatedRowModel`
 * anyway, so the model is still sliced to one page — which core warns about by name here. Without
 * it the window at index 10 finds no row behind it and the pads under test would be measured on an
 * empty band.
 */
function renderWindowWithInfinite(items: VirtualItem[]) {
	return render(
		<Grid
			features={TEST_FEATURES}
			data={DATA}
			columns={TEST_COLUMNS}
			pagination={{
				mode: PaginationMode.Infinite,
				pageSize: ROW_COUNT,
				hasNextPage: true,
				onLoadMore: () => {},
			}}
		>
			<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
		</Grid>,
	)
}

/**
 * The two ids the pinning cases pin, and what pinning them does to the centre list's numbering.
 *
 * A pinned row leaves `getCenterRows()`, which is the list the virtualizer counts and the list
 * `VirtualBody` indexes the window into — so pinning the first row shifts every centre index by
 * one, and with the ids numbered from one, centre index `i` is the record `i + 2`. The two ends of
 * the model are pinned on purpose: neither band is ever also inside the window, which is what makes
 * the band's own offset readable on its own.
 */
const PINNED_TOP_ROW_ID = '1'
const PINNED_BOTTOM_ROW_ID = String(ROW_COUNT)
const CENTER_INDEX_TO_ID = 2

/**
 * `renderWindow` with both ends of the model pinned, so the three bands share one tbody.
 *
 * `stubVirtualizer` still reports {@link TOTAL_SIZE} for the full {@link ROW_COUNT} while the centre
 * list is two rows shorter — a fixture artefact with no bearing on what these cases assert, since
 * the pads read the window's own span and the total size and never the row count. In a browser the
 * two agree: the virtualizer counts the centre rows, the pinned rows are in flow around the band,
 * and the three sum to the full list's height.
 */
function renderWindowWithPinnedRows(items: VirtualItem[]) {
	return render(
		<Grid
			features={TEST_FEATURES}
			data={DATA}
			columns={TEST_COLUMNS}
			pagination={{ pageSize: ROW_COUNT }}
			pinning={{ row: true }}
			initialState={{ rowPinning: { top: [PINNED_TOP_ROW_ID], bottom: [PINNED_BOTTOM_ROW_ID] } }}
		>
			<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
		</Grid>,
	)
}

/**
 * The virtualized **shell**, which is what carries the scrollport the pinned rows stick inside.
 *
 * `virtualization` on the grid is what makes `DataGrid.Table` render its virtualized branch at all;
 * the stub provider inside still overrides the virtualizer the body reads, so the window stays the
 * test's own while the wrapper and scrollport come out as a browser would get them.
 */
function renderVirtualShell(layout: { stickyHeader: boolean }) {
	return render(
		<Grid
			features={TEST_FEATURES}
			data={DATA}
			columns={TEST_COLUMNS}
			pagination={{ pageSize: ROW_COUNT }}
			virtualization={{ row: { estimateSize: ROW_HEIGHT } }}
			layout={layout}
			pinning={{ row: true }}
			initialState={{ rowPinning: { top: [PINNED_TOP_ROW_ID], bottom: [PINNED_BOTTOM_ROW_ID] } }}
		>
			<VirtualProvider rowVirtualizer={stubVirtualizer(windowItems(10, WINDOW_COUNT))}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
		</Grid>,
	)
}

/**
 * The smallest adapter that reports one row as dragging — the only half of a kit's adapter these
 * cases need.
 *
 * `virtualized-row-drag.test.tsx`'s `makeDrivableAdapter` also exposes the index each row
 * registered at and a way to fire a drop; neither is geometry, so this does not copy them. What it
 * does share is the mechanism: the body keeps a dragged row mounted because a row that renders
 * while `isDragging` records itself as the grid's active drag, which is why a held row can only be
 * driven here by rendering the window **over** it first and scrolling away after.
 */
function makeDraggingAdapter(draggingId: string): DndAdapter {
	return {
		Provider: ({ children }) => <>{children}</>,
		useSortableItem: (spec): SortableItemHandle => ({
			ref: () => {},
			handleRef: () => {},
			isDragging: spec.id === draggingId,
		}),
	}
}

/**
 * `renderWindow` with a drag in flight, rendered once per window handed in.
 *
 * The first window has to contain the dragged row: nothing publishes an active drag but a rendering
 * row, so a grid whose first frame is already scrolled past the row holds nothing. Each further
 * window is a re-render, which is what an auto-scroll frame is.
 */
function renderWindowWithDrag(draggingId: string, ...windows: VirtualItem[][]) {
	const { DataGrid: DragGrid } = createDataGrid({ components: testComponents, dnd: makeDraggingAdapter(draggingId) })
	const tree = (items: VirtualItem[]) => (
		<DragGrid
			features={TEST_FEATURES}
			data={DATA}
			columns={TEST_COLUMNS}
			pagination={{ pageSize: ROW_COUNT }}
			ordering={{ row: true }}
		>
			<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
			</VirtualProvider>
		</DragGrid>
	)
	const [first, ...rest] = windows
	const result = render(tree(first ?? []))
	for (const items of rest) result.rerender(tree(items))

	return result
}

describe('flow windowing', () => {
	it('offsets the band with the tbody padding and reserves the rest below it', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ paddingTop: '400px', paddingBottom: `${String(TOTAL_SIZE - 600)}px` })
	})

	it('reserves the whole scroll height on the tbody, so the scrollport keeps its range', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		// A floor, not a fixed `height`: the loader row can push the band's content past the
		// reservation, and a fixed height would leave it overflowing a box the heroui kit clips.
		// The two are the same box whenever nothing follows the band — see `VirtualBody`'s docblock.
		expect(tbody).toHaveStyle({ minHeight: `${String(TOTAL_SIZE)}px` })
	})

	it('keeps rows in flow — an explicit height and no transform', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const row = container.querySelector('[data-slot="tr"][data-virtual="row"]')

		expect(row).toHaveStyle({ height: `${String(ROW_HEIGHT)}px` })
		expect(row?.getAttribute('style')).not.toContain('transform')
	})

	it('pads nothing for an empty window but still reserves the scroll height', () => {
		const { container } = renderWindow([])
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ paddingTop: '0px', paddingBottom: '0px', minHeight: `${String(TOTAL_SIZE)}px` })
	})

	it('renders a held row that has left the window out of flow, so the band keeps its offset', () => {
		// Row "3" is picked up inside the opening window, then the window scrolls to index 200 — far
		// enough that the row is nowhere near it. Row "3" rather than "1" so the offset asserted below
		// is not zero, which is also what a missing transform reads as.
		const { container } = renderWindowWithDrag(
			HELD_ROW_ID,
			windowItems(0, WINDOW_COUNT),
			windowItems(SCROLLED_WINDOW_FIRST, WINDOW_COUNT),
		)
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')
		const heldRow = container.querySelector(`[data-slot="tr"][data-row-id="${HELD_ROW_ID}"]`)

		// Both pads, because the measured regression had two halves: `paddingTop` stuck at `0px` and
		// the band shrinking by the held row's `size` per auto-scroll frame. The `height` case below
		// cannot stand in for the second half — that is `getTotalSize()`, which neither pad feeds.
		expect(tbody).toHaveStyle(padsFor(SCROLLED_WINDOW_FIRST))
		expect(heldRow).toHaveAttribute('data-virtual', 'row-held')
		expect(heldRow?.getAttribute('style')).toContain(`translateY(${String(HELD_ROW_INDEX * ROW_HEIGHT)}px)`)
	})

	it('keeps both pads when the window has scrolled back **above** the held row', () => {
		/*
		 * The upward drag, and the only arrangement in which the **bottom** pad is assertable at all.
		 *
		 * The case above holds a row the window has passed going down, so the held row sorts to the
		 * front of `centerEntries` and the list's *last* entry is still the window's own last row —
		 * which means a bottom pad computed from `centerEntries` comes out right there by accident.
		 * Probed: mutating only the `after` arithmetic passed every other case in this file. Held
		 * from below, the held row is `centerEntries.at(-1)` and its `end` of 36000px would collapse
		 * the pad from 39800px to 4000px, so this is what makes the pair of pads a real assertion.
		 */
		const { container } = renderWindowWithDrag(
			HELD_BELOW_ROW_ID,
			windowItems(HELD_BELOW_ROW_INDEX - 2, WINDOW_COUNT),
			windowItems(0, WINDOW_COUNT),
		)
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')
		const heldRow = container.querySelector(`[data-slot="tr"][data-row-id="${HELD_BELOW_ROW_ID}"]`)

		expect(tbody).toHaveStyle(padsFor(0))
		expect(heldRow).toHaveAttribute('data-virtual', 'row-held')
		expect(heldRow?.getAttribute('style')).toContain(`translateY(${String(HELD_BELOW_ROW_INDEX * ROW_HEIGHT)}px)`)
	})

	it('keeps the reserved scroll height while a row outside the window is held', () => {
		const { container } = renderWindowWithDrag(
			HELD_ROW_ID,
			windowItems(0, WINDOW_COUNT),
			windowItems(SCROLLED_WINDOW_FIRST, WINDOW_COUNT),
		)
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ minHeight: `${String(TOTAL_SIZE)}px` })
	})

	it('leaves a held row that is still inside the window in flow, rendered once', () => {
		const { container } = renderWindowWithDrag(HELD_ROW_ID, windowItems(0, WINDOW_COUNT))
		const heldRows = container.querySelectorAll(`[data-slot="tr"][data-row-id="${HELD_ROW_ID}"]`)

		// The count, not just the first match: a row that is both in the window and held must render
		// exactly once, which is what `isHeldInWindow` in `VirtualBody` is for. `querySelector` alone
		// reads the first of two identical rows and cannot tell a duplicate from a single row.
		expect(heldRows).toHaveLength(1)
		expect(heldRows[0]).toHaveAttribute('data-virtual', 'row')
		expect(heldRows[0]?.getAttribute('style')).not.toContain('transform')
	})

	it('renders the virtualized loader row in flow, with no transform', () => {
		const { container } = renderWindowWithInfinite(windowItems(10, WINDOW_COUNT))
		const loader = container.querySelector('[data-slot="load-more-row"][data-virtual="load-more"]')

		expect(loader).not.toBeNull()
		expect(loader?.getAttribute('style') ?? '').not.toContain('transform')
	})

	it('moves the bottom pad onto the loader, so it follows the band instead of landing inside it', () => {
		/*
		 * The pad is reserved exactly once, and by the loader rather than by the tbody.
		 *
		 * `padding-bottom` is laid out *after* every child, so it cannot separate the band from a row
		 * that follows it: left on the tbody it puts the loader at the window's bottom edge — which,
		 * for a window near the top of a long list, is a "Load more" control floating mid-list with
		 * 39 400px of reserved range below it. Both halves are asserted because either one alone
		 * passes for the wrong reason: a `0px` pad with no margin drops the reservation and shortens
		 * the list by the pad, and a margin beside a live pad counts it twice and puts the loader a
		 * whole pad *below* the list's end.
		 */
		const { container } = renderWindowWithInfinite(windowItems(10, WINDOW_COUNT))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')
		const loader = container.querySelector('[data-slot="load-more-row"][data-virtual="load-more"]')

		// The band is real, not an empty tbody the pads happen to be written on: `pageSize` is what
		// keeps the model from being sliced past this window, and without it the two assertions below
		// would still pass while measuring nothing.
		expect(container.querySelectorAll('[data-slot="tr"][data-virtual="row"]')).toHaveLength(WINDOW_COUNT)
		expect(tbody).toHaveStyle({ paddingTop: padsFor(10).paddingTop, paddingBottom: '0px' })
		expect(loader).toHaveStyle({ marginTop: padsFor(10).paddingBottom })
	})
})

describe('flow windowing with pinned rows', () => {
	/*
	 * Pinned rows share the tbody with the band, and the offset deliberately stays on the container
	 * — which means the band is displaced by the pinned-top rows' height, since they are in flow
	 * ahead of it. That reads like a defect and is not one: measured in both kits, the displacement
	 * is exactly the height the pinned band overlays once it sticks below the header, so the first
	 * row the user can actually see sits at the centre offset the virtualizer computed from
	 * `scrollTop` — which is why nothing here needs a `scrollMargin`. The brief's two predicted
	 * failures were measured and both are arithmetic, not geometry: the tbody exceeding `totalSize`
	 * by the pinned rows' height is the pinned rows paying for themselves, because a pinned row
	 * leaves `getCenterRows()` and so leaves the virtualizer's count — the scrollport's
	 * `scrollHeight` came out within 1px of the same grid with nothing pinned (490 040 against
	 * 490 041 in shadcn, 490 054 against 490 039 in heroui, the 1px being a border).
	 *
	 * What the measurement did indict is one rule away from the band: see the sticky-header case at
	 * the end of this block.
	 */
	it('keeps the pads window-derived while the pinned bands share the tbody', () => {
		const { container } = renderWindowWithPinnedRows(windowItems(10, WINDOW_COUNT))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ ...padsFor(10), minHeight: `${String(TOTAL_SIZE)}px` })
	})

	it('renders the pinned bands around the band, with the window still in flow', () => {
		const { container } = renderWindowWithPinnedRows(windowItems(10, WINDOW_COUNT))
		const rows = [...container.querySelectorAll('[data-slot="tr"][data-row-id]')]
		const windowRows = [...container.querySelectorAll('[data-slot="tr"][data-virtual="row"]')]

		// DOM order, not just presence: the top band has to precede the band for the container's
		// padding to land ahead of it, and the bottom band has to follow it.
		expect(rows.map((row) => row.getAttribute('data-row-id'))).toEqual([
			PINNED_TOP_ROW_ID,
			...Array.from({ length: WINDOW_COUNT }, (_, offset) => String(10 + offset + CENTER_INDEX_TO_ID)),
			PINNED_BOTTOM_ROW_ID,
		])
		// No margin and no transform on the band's own rows: the offset stays on the container,
		// which is what the displacement above is the consequence of.
		for (const row of windowRows) {
			expect(row).toHaveStyle({ height: `${String(ROW_HEIGHT)}px` })
			expect(row.getAttribute('style') ?? '').not.toContain('margin')
			expect(row.getAttribute('style') ?? '').not.toContain('transform')
		}
	})

	it('declares the sticky header on the virtualized scrollport, so pinned rows stack below it', () => {
		/*
		 * The one thing the measurement indicted. The virtualized branch used to omit this
		 * attribute, which left the stylesheet's
		 * `[data-slot='table-scroll'][data-sticky-header='true'] [data-slot='tr'][data-pinned='top']`
		 * rule unmatched — so a pinned row stuck at the scrollport's own top edge, under a `z-10`
		 * sticky header: measured at `scrollTop` 4900, 41px of its 49 painted over in shadcn and 37
		 * of 58 in heroui, and the band's first rows exposed underneath the window instead.
		 *
		 * Asserted on the attribute rather than on the offset because jsdom computes no layout and
		 * resolves no `calc()`; the geometry is measured in a browser, and this is the structural
		 * half that a later edit to either branch would break silently.
		 */
		const { container } = renderVirtualShell({ stickyHeader: true })
		const scroll = container.querySelector('[data-slot="table-scroll"][data-virtualized="true"]')

		expect(scroll).toHaveAttribute('data-sticky-header', 'true')
	})

	it('leaves the attribute off a virtualized grid whose header does not stick', () => {
		// The pair, because the attribute also opens the `max-height` bound meant for the
		// non-virtualized scrollport — stamping it unconditionally would be a different defect.
		const { container } = renderVirtualShell({ stickyHeader: false })
		const scroll = container.querySelector('[data-slot="table-scroll"][data-virtualized="true"]')

		expect(scroll).not.toHaveAttribute('data-sticky-header')
	})
})

describe('flow windowing while a drag displaces the held row', () => {
	/*
	 * The body renders the drag's **projected** order: the model with the held row moved to where the
	 * adapter reported displacing it. Rendered in model order instead, the body put the held row back at
	 * its old slot on every re-render of an auto-scroll while the drag library had moved it — the two
	 * orders disagreed about one row, the library's index space lost its density, and displacement died
	 * for the rest of the gesture. `DndProviderProps.onDisplace` has the measurement.
	 */

	/** An adapter whose Provider hands the test the grid's `onDisplace`, with the dragged row switchable. */
	function makeDisplacingAdapter(drag: { id: string | null }) {
		const captured: { onDisplace?: (event: DndDragOverEvent) => void } = {}
		const adapter: DndAdapter = {
			Provider: ({ onDisplace, children }) => {
				if (onDisplace) captured.onDisplace = onDisplace
				return <>{children}</>
			},
			useSortableItem: (spec): SortableItemHandle => ({
				ref: () => {},
				handleRef: () => {},
				isDragging: spec.id === drag.id,
			}),
		}
		return { adapter, captured }
	}

	function renderDisplacing(firstWindow: VirtualItem[]) {
		const drag: { id: string | null } = { id: HELD_ROW_ID }
		const { adapter, captured } = makeDisplacingAdapter(drag)
		const { DataGrid: DragGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		const tree = (items: VirtualItem[]) => (
			<DragGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={TEST_COLUMNS}
				pagination={{ pageSize: ROW_COUNT }}
				ordering={{ row: true }}
			>
				<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
					<DataGrid.Table>
						<DataGrid.Body />
					</DataGrid.Table>
				</VirtualProvider>
			</DragGrid>
		)
		const result = render(tree(firstWindow))

		return {
			...result,
			scrollTo: (items: VirtualItem[]) => {
				result.rerender(tree(items))
			},
			displaceOnto: (targetId: string) => {
				act(() => {
					captured.onDisplace?.({
						axis: DragAxis.Row,
						surface: DragSurface.Table,
						sourceId: HELD_ROW_ID,
						targetId,
					})
				})
			},
			release: (items: VirtualItem[]) => {
				drag.id = null
				result.rerender(tree(items))
			},
		}
	}

	const bandIds = (container: HTMLElement) =>
		[...container.querySelectorAll('[data-slot="tr"][data-virtual="row"]')].map((row) =>
			row.getAttribute('data-row-id'),
		)

	it('renders the held row in flow at the slot it was displaced to', () => {
		const { container, displaceOnto } = renderDisplacing(windowItems(0, WINDOW_COUNT))

		displaceOnto('5')

		// `3` carried past `4` and `5`, and the two moved up into the slots it left — what the drag
		// library shows, and so what the body has to render for the two orders to be one.
		expect(bandIds(container)).toEqual(['1', '2', '4', '5', '3'])
		expect(container.querySelectorAll(`[data-row-id="${HELD_ROW_ID}"]`)).toHaveLength(1)
	})

	it('keeps the displaced arrangement after the window turns over under the drag', () => {
		/*
		 * The reported case. The window scrolls far from where the drag started, the held row is
		 * displaced into the new window, and the window then moves on by a row — a re-render that used to
		 * put `3` back at model slot 2, outside the window, while the library had it at slot 201.
		 */
		const { container, scrollTo, displaceOnto } = renderDisplacing(windowItems(0, WINDOW_COUNT))
		scrollTo(windowItems(SCROLLED_WINDOW_FIRST, WINDOW_COUNT))
		displaceOnto('203')
		scrollTo(windowItems(SCROLLED_WINDOW_FIRST + 1, WINDOW_COUNT))

		// With `3` lifted out every later row moves up a slot, so slot 201 holds `203` and `3` sits right
		// behind it at slot 202 — the slot the library displaced it to.
		expect(bandIds(container)).toEqual(['203', '3', '204', '205', '206'])
		expect(container.querySelector('[data-virtual="row-held"]')).toBeNull()
	})

	it('keeps the pads the window’s own while the held row moves within it', () => {
		/*
		 * The window's span is unchanged by a displacement — a slot's geometry is the model's, only its
		 * occupant moves — so the band must not jump by a row. Measured in both kits too: `paddingTop`
		 * held its value across every displacement step.
		 */
		const { container, scrollTo, displaceOnto } = renderDisplacing(windowItems(0, WINDOW_COUNT))
		scrollTo(windowItems(SCROLLED_WINDOW_FIRST, WINDOW_COUNT))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')
		expect(tbody).toHaveStyle(padsFor(SCROLLED_WINDOW_FIRST))

		displaceOnto('202')
		expect(tbody).toHaveStyle(padsFor(SCROLLED_WINDOW_FIRST))
		displaceOnto('204')
		expect(tbody).toHaveStyle(padsFor(SCROLLED_WINDOW_FIRST))
	})

	it('holds the held row out of flow at its projected slot once that slot leaves the window', () => {
		const { container, scrollTo, displaceOnto } = renderDisplacing(windowItems(0, WINDOW_COUNT))
		scrollTo(windowItems(SCROLLED_WINDOW_FIRST, WINDOW_COUNT))
		displaceOnto('203')
		scrollTo(windowItems(0, WINDOW_COUNT))

		// Slot 202, not model slot 2 — which the window at 0 would otherwise contain and render it in.
		const heldRow = container.querySelector(`[data-slot="tr"][data-row-id="${HELD_ROW_ID}"]`)
		expect(heldRow).toHaveAttribute('data-virtual', 'row-held')
		expect(heldRow?.getAttribute('style')).toContain(`translateY(${String(202 * ROW_HEIGHT)}px)`)
		expect(bandIds(container)).toEqual(['1', '2', '4', '5', '6'])
	})

	it('returns to the model order when the drag ends, drop or cancel alike', () => {
		const { container, displaceOnto, release } = renderDisplacing(windowItems(0, WINDOW_COUNT))
		displaceOnto('5')

		// The table did not change — the adapter committed nothing — so the model is what renders.
		release(windowItems(0, WINDOW_COUNT))

		expect(bandIds(container)).toEqual(['1', '2', '3', '4', '5'])
	})
})
