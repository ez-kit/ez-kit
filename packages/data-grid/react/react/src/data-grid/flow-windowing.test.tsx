import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { TEST_COLUMNS, TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { VirtualProvider } from './virtual-context'

import type { TestRow } from '../test-utils'
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual'

const ROW_HEIGHT = 40
const ROW_COUNT = 1_000
const TOTAL_SIZE = ROW_COUNT * ROW_HEIGHT

const DATA: TestRow[] = Array.from({ length: ROW_COUNT }, (_, index) => ({
	id: index + 1,
	name: `Row ${String(index + 1)}`,
	age: 20 + (index % 50),
}))

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
 * `estimateSize`, and `VirtualBody` reads it by row index to hold a dragged row.
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

describe('flow windowing', () => {
	it('offsets the band with the tbody padding and reserves the rest below it', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ paddingTop: '400px', paddingBottom: `${String(TOTAL_SIZE - 600)}px` })
	})

	it('reserves the whole scroll height on the tbody, so the scrollport keeps its range', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ height: `${String(TOTAL_SIZE)}px` })
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

		expect(tbody).toHaveStyle({ paddingTop: '0px', paddingBottom: '0px', height: `${String(TOTAL_SIZE)}px` })
	})
})
