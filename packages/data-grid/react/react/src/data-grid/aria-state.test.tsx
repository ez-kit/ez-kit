import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type Row = { id: number; name: string }

const ROWS: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Row ${String(index + 1)}` }))
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

function renderGrid(config: Record<string, unknown> = {}) {
	return render(
		<DataGrid
			features={TEST_FEATURES}
			data={ROWS}
			columns={COLUMNS}
			components={testComponents}
			{...config}
		/>,
	)
}

const tableOf = (container: HTMLElement) => container.querySelector('[data-slot="table"]')
const bodyRowsOf = (container: HTMLElement) => [...container.querySelectorAll('[data-slot="tbody"] [data-slot="tr"]')]

describe('aria-sort', () => {
	it('reports the column that is sorted, and the direction', () => {
		const { container } = renderGrid({ sorting: true, initialState: { sorting: [{ id: 'name', desc: true }] } })

		expect(container.querySelector('[data-column-id="name"]')?.getAttribute('aria-sort')).toBe('descending')
	})

	it("says 'none' for a sortable column that is not sorted", () => {
		const { container } = renderGrid({ sorting: true })

		expect(container.querySelector('[data-column-id="name"]')?.getAttribute('aria-sort')).toBe('none')
	})

	it('writes nothing at all when the column cannot be sorted', () => {
		// `'none'` means "sortable, not sorted" — writing it here would announce the whole grid
		// as sortable.
		const { container } = renderGrid({ sorting: false })

		expect(container.querySelector('[data-column-id="name"]')?.hasAttribute('aria-sort')).toBe(false)
	})
})

describe('aria-selected', () => {
	it('reports each row, and follows the selection', () => {
		const { container } = renderGrid({ selection: true, initialState: { rowSelection: { '1': true } } })
		const rows = bodyRowsOf(container)

		expect(rows[0]?.getAttribute('aria-selected')).toBe('true')
		expect(rows[1]?.getAttribute('aria-selected')).toBe('false')
	})

	it('writes nothing on a grid with no selection', () => {
		const { container } = renderGrid()

		expect(bodyRowsOf(container)[0]?.hasAttribute('aria-selected')).toBe(false)
	})
})

describe('aria-expanded', () => {
	it('reports a closed expandable row', () => {
		const { container } = renderGrid({ expanding: { component: () => <div>detail</div> } })

		expect(bodyRowsOf(container)[0]?.getAttribute('aria-expanded')).toBe('false')
	})

	it('follows the expanded set', () => {
		// Indexed off `data-row-id` rather than off the row list: sub-content mode renders the
		// open row's panel as the very next `<tr>`, so positional indices stop matching the data
		// the moment one row is open.
		const { container } = renderGrid({
			expanding: { component: () => <div>detail</div> },
			initialState: { expanded: { '1': true } },
		})
		const rowById = (id: string) => container.querySelector(`[data-slot="tbody"] [data-row-id="${id}"]`)

		expect(rowById('1')?.getAttribute('aria-expanded')).toBe('true')
		expect(rowById('2')?.getAttribute('aria-expanded')).toBe('false')
	})

	it('writes nothing at all on a grid whose rows do not expand', () => {
		// `false` means "expandable, currently closed" — writing it here would announce a flat
		// grid as a tree, the same way `aria-sort='none'` would announce it as sortable.
		const { container } = renderGrid()

		expect(bodyRowsOf(container)[0]?.hasAttribute('aria-expanded')).toBe(false)
	})
})

describe('aria-rowcount / aria-rowindex', () => {
	it('counts the whole set, not the page, and indexes rows across pages', () => {
		const { container } = renderGrid({ pagination: { pageSize: 5 }, initialState: { pagination: { pageIndex: 1 } } })

		// 12 rows plus the one header row ARIA counts.
		expect(tableOf(container)?.getAttribute('aria-rowcount')).toBe('13')
		// Page two, first row: one header row, five rows behind it, so index 7.
		expect(bodyRowsOf(container)[0]?.getAttribute('aria-rowindex')).toBe('7')
	})

	it('writes neither when the DOM already holds every row', () => {
		// Short enough to fit one page: the DOM holds the whole set, so ARIA says a reader may
		// count what it sees.
		const { container } = render(
			<DataGrid
				features={TEST_FEATURES}
				data={ROWS.slice(0, 3)}
				columns={COLUMNS}
				components={testComponents}
			/>,
		)

		expect(tableOf(container)?.hasAttribute('aria-rowcount')).toBe(false)
		expect(bodyRowsOf(container)[0]?.hasAttribute('aria-rowindex')).toBe(false)
	})

	it("reports ARIA's unknown sentinel for a manual grid given no total", () => {
		const { container } = renderGrid({ pagination: { manual: true, pageSize: 5 } })

		expect(tableOf(container)?.getAttribute('aria-rowcount')).toBe('-1')
	})
})

describe('the live region', () => {
	it('reports the size of the result set', () => {
		const { container } = renderGrid()

		expect(container.querySelector('[role="status"]')?.textContent).toBe('12 rows')
	})
})
