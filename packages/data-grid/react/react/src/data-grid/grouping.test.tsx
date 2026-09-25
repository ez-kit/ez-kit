import { createColumns } from '@ez-kit/data-grid-core'
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderGrid } from '../test-utils'

import { DataGrid } from './data-grid'

import type { RenderGridResult } from '../test-utils'
import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactNode } from 'react'

type Row = {
	id: number
	region: string
	manager: string
	amount: number
}

const ROWS: Row[] = [
	{ id: 1, region: 'EMEA', manager: 'Ivanov', amount: 50 },
	{ id: 2, region: 'EMEA', manager: 'Ivanov', amount: 30 },
	{ id: 3, region: 'EMEA', manager: 'Petrova', amount: 20 },
	{ id: 4, region: 'APAC', manager: 'Chen', amount: 100 },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'region', header: 'Region' },
	{ accessorKey: 'manager', header: 'Manager' },
	{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' },
])

/** A grid over {@link ROWS}, grouped by region unless a case says otherwise. */
const grouped = (
	config: Partial<UseDataGridConfig<GridFeatures, Row>> = {},
	children?: ReactNode,
): RenderGridResult<Row> =>
	renderGrid<Row>({ data: ROWS, columns: COLUMNS, grouping: { by: ['region'] }, ...config }, children)

/** The same grid with a footer mounted, and no grouping — the grand-total cases. */
const totalled = (columns: typeof COLUMNS): RenderGridResult<Row> =>
	renderGrid<Row>(
		{ data: ROWS, columns },
		<DataGrid.Table>
			<DataGrid.Header />
			<DataGrid.Body />
			<DataGrid.Footer />
		</DataGrid.Table>,
	)

describe('the group cell', () => {
	it('renders a label and a count on a group row, and nothing on a leaf row', () => {
		const { container } = grouped()

		const cells = container.querySelectorAll('[data-slot="group-cell"]')
		expect(cells.length).toBeGreaterThan(0)

		const labels = [...container.querySelectorAll('[data-slot="group-label"]')].map((el) => el.textContent)
		expect(labels).toEqual(['EMEA', 'APAC'])

		const counts = [...container.querySelectorAll('[data-slot="group-count"]')].map((el) => el.textContent)
		expect(counts).toEqual(['(3)', '(1)'])
	})

	it('marks the cell as the group system column and carries the row depth', () => {
		const { container } = grouped()

		const cell = container.querySelector('[data-slot="group-cell"]')
		expect(cell?.getAttribute('data-system-column')).toBe('group')
		expect(cell?.getAttribute('data-depth')).toBe('0')
	})

	it('nests a second level one step deeper', () => {
		const { container } = grouped({ grouping: { by: ['region', 'manager'] } })

		const depths = [...container.querySelectorAll('[data-slot="group-cell"]')].map((el) =>
			el.getAttribute('data-depth'),
		)
		expect(depths).toContain('0')
	})

	it('names a group whose value is blank rather than leaving the cell empty', () => {
		const sparse: Row[] = [{ id: 1, region: '', manager: 'Ivanov', amount: 1 }]
		const { container } = grouped({ data: sparse })

		expect(container.querySelector('[data-slot="group-label"]')?.textContent).toBe('(Blank)')
	})

	/**
	 * Driven through the table rather than by clicking, because the fixture kit renders
	 * `Chevron: () => null` — it has no control to click. What the chevron does is
	 * `row.toggleExpanded()`, which is exactly what this calls; the kits' own chevrons are
	 * covered by the browser suite.
	 */
	it('shows a group\u2019s rows once it is expanded', () => {
		const { container, table } = grouped()

		const before = container.querySelectorAll('[data-slot="tr"][data-row-id]').length
		act(() => {
			table.getRowModel().rows[0]?.toggleExpanded()
		})

		expect(container.querySelectorAll('[data-slot="tr"][data-row-id]').length).toBeGreaterThan(before)
	})
})

/**
 * Grouping driven **after** mount, rather than seeded — the second frame, not the first.
 *
 * This is where the subscription defect lived: `body.tsx`, `header.tsx` and `table.tsx` read the
 * row model and the column list but subscribed to no `grouping` slice, so setting the levels at
 * run time moved the state without re-rendering either. The group-by bar updated, because it
 * does subscribe, which produced a grid whose bar said "grouped by Region" above a flat table
 * still showing the Region column.
 *
 * **These cases assert the behaviour; they are not what guards it.** Measured: they pass with
 * the three subscriptions removed, because the fixture harness re-renders for reasons of its own
 * and jsdom never reproduces the isolation a real page has. What caught the defect, and what
 * fails without the fix, is `e2e/packages/data-grid/grouping/grouping.spec.ts` — every case
 * there that regroups from the column menu. Recorded rather than left implied, so nobody reads a
 * green run here as proof the subscriptions are still there.
 */
describe('grouping applied after the first render', () => {
	it('regroups the body', () => {
		const { container, table } = grouped({ grouping: true })

		expect(container.querySelectorAll('[data-slot="tr"][data-group-row="true"]')).toHaveLength(0)

		act(() => {
			table.setGrouping(['region'])
		})

		expect(container.querySelectorAll('[data-slot="tr"][data-group-row="true"]')).toHaveLength(2)
	})

	it('takes the grouped column out of the header, and puts it back', () => {
		const { container, table } = grouped({ grouping: true })

		const headerIds = () =>
			[...container.querySelectorAll('[data-slot="th"]')].map((el) => el.getAttribute('data-column-id'))
		expect(headerIds()).toContain('region')

		act(() => {
			table.setGrouping(['region'])
		})
		expect(headerIds()).not.toContain('region')

		act(() => {
			table.setGrouping([])
		})
		expect(headerIds()).toContain('region')
	})
})

describe('the row', () => {
	it('marks a group row with data-group-row and a leaf row without it', () => {
		const { container } = grouped()

		const rows = [...container.querySelectorAll('[data-slot="tr"][data-row-id]')]
		expect(rows.length).toBeGreaterThan(0)
		expect(rows.every((row) => row.getAttribute('data-group-row') === 'true')).toBe(true)
	})

	it('announces a group row as collapsed, and as expanded once opened', () => {
		const { container, table } = grouped()

		expect(container.querySelector('[data-slot="tr"][data-group-row="true"]')?.getAttribute('aria-expanded')).toBe(
			'false',
		)

		act(() => {
			table.getRowModel().rows[0]?.toggleExpanded()
		})

		expect(container.querySelector('[data-slot="tr"][data-group-row="true"]')?.getAttribute('aria-expanded')).toBe(
			'true',
		)
	})
})

describe('the four cell modes', () => {
	it('renders a column aggregate on the group row', () => {
		const { container } = grouped()

		const aggregated = [...container.querySelectorAll('[data-aggregated-cell="true"]')].map((el) => el.textContent)
		expect(aggregated).toEqual(['100', '100'])
	})

	/**
	 * The defect upstream's own guidance leads with, asserted against what actually protects us.
	 *
	 * `manager` is neither the grouping column nor aggregated, so on the EMEA group row it has no
	 * group-wide value — only whatever datum one of its three rows happened to carry. Showing
	 * `Ivanov` there would read as the region's manager, against a subtotal spanning two of them.
	 *
	 * What prevents it is that `cell.getValue()` is `undefined` on such a cell, so the ordinary
	 * view branch renders nothing. Asserted that way round rather than through
	 * `data-placeholder-cell`, because upstream's `getIsPlaceholder()` means something narrower
	 * than this case — see the note on the placeholder branch in `cell.tsx`.
	 */
	it('shows no leaf datum for a column that is neither grouped nor aggregated', () => {
		const { container } = grouped()

		const groupRow = container.querySelector('[data-slot="tr"][data-group-row="true"]')
		expect(groupRow?.textContent).not.toContain('Ivanov')
		expect(groupRow?.textContent).not.toContain('Petrova')
	})

	/**
	 * Asserted on `data-column-id` rather than on the header's text: a header's rendered label is
	 * the fixture kit's business and differs between React 18 and 19, while which columns the
	 * header holds is the thing `groupedColumnMode: 'remove'` actually decides.
	 */
	it('takes the grouped column out of the header while it is grouped', () => {
		const { container } = grouped()

		const headers = [...container.querySelectorAll('[data-slot="th"]')].map((el) => el.getAttribute('data-column-id'))
		expect(headers).not.toContain('region')
		expect(headers).toContain('amount')
	})

	it('renders an author-supplied aggregated component instead of the cell-type view', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'region', header: 'Region' },
			{
				accessorKey: 'amount',
				header: 'Amount',
				aggregation: { fn: 'sum', component: ({ value }: { value: unknown }) => <span>total {String(value)}</span> },
			},
		])
		const { container } = grouped({ columns })

		expect(container.querySelector('[data-aggregated-cell="true"]')?.textContent).toBe('total 100')
	})
})

describe('the footer grand total', () => {
	it('totals a column with no grouping configured at all', () => {
		const { container } = totalled(COLUMNS)

		expect(container.querySelector('[data-slot="tfoot"]')?.textContent).toContain('200')
	})

	it('leaves a column with its own footer alone', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'region', header: 'Region' },
			{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum', footer: 'Sum of all' },
		])
		const { container } = totalled(columns)

		const footer = container.querySelector('[data-slot="tfoot"]')
		expect(footer?.textContent).toContain('Sum of all')
		expect(footer?.textContent).not.toContain('200')
	})

	it('leaves a column with no aggregation empty', () => {
		const columns = createColumns<Row>([{ accessorKey: 'region', header: 'Region' }])
		const { container } = totalled(columns)

		expect(container.querySelector('[data-slot="tfoot"]')?.textContent).toBe('')
	})
})

describe('a group row is not a record', () => {
	it('offers no row actions on it', () => {
		const { container } = grouped({ deleting: { onDelete: vi.fn() } })

		const groupRow = container.querySelector('[data-slot="tr"][data-group-row="true"]')
		expect(groupRow?.querySelector('[data-system-column="actions"] button')).toBeNull()
	})

	it('still draws the actions cell on a leaf row', () => {
		const { container, table } = grouped({ deleting: { onDelete: vi.fn() } })

		act(() => {
			table.getRowModel().rows[0]?.toggleExpanded()
		})

		const leaf = [...container.querySelectorAll('[data-slot="tr"][data-row-id]')].find(
			(row) => row.getAttribute('data-group-row') === null,
		)
		expect(leaf?.querySelector('[data-system-column="actions"] button')).not.toBeNull()
	})
})
