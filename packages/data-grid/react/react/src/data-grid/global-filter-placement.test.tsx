import { describe, expect, it } from 'vitest'

import { TEST_FEATURES, renderWithComponents, TEST_COLUMNS, TEST_ROWS } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement } from 'react'

type TestRow = (typeof TEST_ROWS)[number]

const PLACEHOLDER = 'Find rows'

function renderDefaultLayout(config: Partial<UseDataGridConfig<GridFeatures, TestRow>> = {}) {
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, TestRow>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		return <DataGrid<GridFeatures, TestRow> table={table} />
	}
	return renderWithComponents(<Harness />)
}

/**
 * The kit's toolbar renders `start`, then `children`, then `end` into one element, so document
 * order is what says which slot a control landed in — which is also the only thing the option
 * promises. Comparing against the page sizer rather than asserting an index keeps the test
 * indifferent to whatever else the toolbar auto-mounts.
 */
function searchComesBeforeSizer(container: HTMLElement): boolean {
	const toolbar = container.querySelector('[role="toolbar"]')
	const search = toolbar?.querySelector(`input[placeholder='${PLACEHOLDER}']`)
	const sizer = toolbar?.querySelector('select')
	if (!search || !sizer) throw new Error('both the search box and the page sizer must be in the toolbar')
	return (search.compareDocumentPosition(sizer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

describe('globalFiltering.toolbar — where the search box sits', () => {
	const shared = {
		pagination: { items: [5, 10], pageSizer: true },
	} satisfies Partial<UseDataGridConfig<GridFeatures, TestRow>>

	it('defaults to the trailing end, after the page sizer', () => {
		const { container } = renderDefaultLayout({
			...shared,
			globalFiltering: { placeholder: PLACEHOLDER },
		})
		expect(searchComesBeforeSizer(container)).toBe(false)
	})

	it("'start' moves it to the leading end, before the page sizer", () => {
		const { container } = renderDefaultLayout({
			...shared,
			globalFiltering: { placeholder: PLACEHOLDER, toolbar: 'start' },
		})
		expect(searchComesBeforeSizer(container)).toBe(true)
	})

	it('the object form places it the same way', () => {
		const { container } = renderDefaultLayout({
			...shared,
			globalFiltering: { placeholder: PLACEHOLDER, toolbar: { placement: 'start' } },
		})
		expect(searchComesBeforeSizer(container)).toBe(true)
	})

	it('false mounts no input at either end', () => {
		const { container } = renderDefaultLayout({
			...shared,
			globalFiltering: { placeholder: PLACEHOLDER, toolbar: false },
		})
		expect(container.querySelector(`input[placeholder='${PLACEHOLDER}']`)).toBeNull()
	})
})
