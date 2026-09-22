import { describe, expect, it } from 'vitest'

import { TEST_FEATURES, renderWithComponents, TEST_COLUMNS, TEST_ROWS } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement, ReactNode } from 'react'

type TestRow = (typeof TEST_ROWS)[number]

const BOTTOM_BAR = "[data-slot='bottom-bar']"
// The kits stamp `data-slot='pagination'` / `'page-sizer'`; the test components are bare, so the
// two controls are addressed by the markup they do render — the sizer's `<select>` and the
// pagination's last-page button.
const SIZER = 'select'
const PAGINATION_LAST_PAGE = '»'

function renderComposed(children: ReactNode, config: Partial<UseDataGridConfig<GridFeatures, TestRow>> = {}) {
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, TestRow>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		return <DataGrid<GridFeatures, TestRow> table={table}>{children}</DataGrid>
	}
	return renderWithComponents(<Harness />)
}

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

describe('DataGrid.BottomBar', () => {
	it('renders the page controls when children are omitted', () => {
		const { container } = renderComposed(<DataGrid.BottomBar />, { pagination: { items: [5, 10] } })
		const bar = container.querySelector(BOTTOM_BAR)
		expect(bar).not.toBeNull()
		expect(bar?.querySelector(SIZER)).not.toBeNull()
		expect(bar?.textContent).toContain(PAGINATION_LAST_PAGE)
	})

	it('renders supplied children instead of the page controls', () => {
		const { container } = renderComposed(<DataGrid.BottomBar>3 selected</DataGrid.BottomBar>, {
			pagination: { items: [5, 10] },
		})
		const bar = container.querySelector(BOTTOM_BAR)
		expect(bar).toHaveTextContent('3 selected')
		expect(bar?.querySelector(SIZER)).toBeNull()
		expect(bar?.textContent).not.toContain(PAGINATION_LAST_PAGE)
	})

	it('hands the class and the style through to the element', () => {
		const { container } = renderComposed(
			<DataGrid.BottomBar
				className='mt-0'
				style={{ marginTop: 0 }}
			>
				content
			</DataGrid.BottomBar>,
		)
		const bar = container.querySelector(BOTTOM_BAR)
		expect(bar).toHaveClass('mt-0')
		expect(bar).toHaveStyle({ marginTop: '0px' })
	})
})

// Which layout mounts the bar is `layouts/presets.test.tsx`' business now — `pageSizer: 'footer'`
// is gone, and `<BottomBarLayout/>` is what asks for a sizer beside the page controls. What is
// left here is the bar itself: placed by hand, it carries both controls in one row.
describe('DataGrid.BottomBar — placed by hand', () => {
	it('carries the page sizer and the pagination in one row', () => {
		const { container } = renderComposed(
			<>
				<DataGrid.Table />
				<DataGrid.BottomBar />
			</>,
			{ pagination: { items: [5, 10] } },
		)
		const bar = container.querySelector(BOTTOM_BAR)
		expect(bar).not.toBeNull()
		expect(bar?.querySelector(SIZER)).not.toBeNull()
		expect(bar?.textContent).toContain(PAGINATION_LAST_PAGE)
	})

	it('leaves the pagination unwrapped when a layout mounts it on its own', () => {
		const { container } = renderDefaultLayout({ pagination: { items: [5, 10] } })
		expect(container.querySelector(BOTTOM_BAR)).toBeNull()
		expect(container.textContent).toContain(PAGINATION_LAST_PAGE)
	})
})
