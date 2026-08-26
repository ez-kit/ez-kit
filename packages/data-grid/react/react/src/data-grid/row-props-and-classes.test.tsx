import { createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type Payment = { id: number; status: 'ok' | 'failed'; amount: number }

const DATA: Payment[] = [
	{ id: 1, status: 'ok', amount: 10 },
	{ id: 2, status: 'failed', amount: -5 },
]

const COLUMNS = createColumns<Payment>([
	{ accessorKey: 'status', header: 'Status', headerClassName: 'th-status' },
	{
		accessorKey: 'amount',
		header: 'Amount',
		cellClassName: ({ value }) => (Number(value) < 0 ? 'negative' : undefined),
	},
])

/**
 * Before these existed, "highlight the failed rows" — the most ordinary request a table gets —
 * had no route through the API: replacing the kit's `Tr` reaches every row and sees no data, and
 * a `<DataGrid.Body>` render function sees the data but drops pinned rows, expanded panels, the
 * fallback states and the rest along with the default body.
 */
describe('rowProps and column class names', () => {
	it('applies rowProps per row without losing structural attributes', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
				rowProps={(row) =>
					row.original.status === 'failed' ? { className: 'row-failed', title: 'failed' } : undefined
				}
			/>,
		)

		const rows = container.querySelectorAll('[data-slot="tr"][data-row-id]')
		expect(rows).toHaveLength(2)
		expect(rows[0]?.className).not.toContain('row-failed')
		expect(rows[1]?.className).toContain('row-failed')
		expect(rows[1]?.getAttribute('title')).toBe('failed')
		// The grid's own attributes survive the merge — the structural CSS depends on them.
		expect(rows[1]?.getAttribute('data-slot')).toBe('tr')
		expect(rows[1]?.getAttribute('data-row-id')).toBeTruthy()
	})

	it('rowProps cannot overwrite the structural data attributes', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
				rowProps={() => ({ 'data-slot': 'hijacked' }) as Record<string, string>}
			/>,
		)

		for (const row of container.querySelectorAll('[data-row-id]')) {
			expect(row.getAttribute('data-slot')).toBe('tr')
		}
	})

	it('applies headerClassName to the column header cell', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
			/>,
		)
		const th = container.querySelector('[data-column-id="status"]')
		expect(th?.className).toContain('th-status')
	})

	it('resolves cellClassName per cell from the value', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
			/>,
		)
		const negatives = container.querySelectorAll('.negative')
		// Only the -5 row qualifies.
		expect(negatives).toHaveLength(1)
		expect(negatives[0]?.textContent).toContain('-5')
	})
})
