import { createColumns } from '@ez-kit/data-grid-core'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataGrid } from '../../data-grid'

type Row = { id: number; name: string }

const ROWS: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Row ${String(index + 1)}` }))
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

/**
 * The ARIA state the shared layer writes, asserted **through React Aria**.
 *
 * `@ez-kit/data-grid-react` puts `aria-sort`, `aria-selected`, `aria-expanded` and `aria-rowcount` on its own
 * elements and its own tests cover that. They do not reach the DOM in this kit: React Aria filters
 * its DOM props and keeps only `aria-label` / `aria-labelledby` / `aria-describedby` /
 * `aria-details` of the aria family, so the kit re-applies them — see `aria-state.ts`. This file
 * is what says the re-application actually lands, and it is a kit test rather than a shared one
 * because the defect it guards is entirely React Aria's prop handling.
 *
 * Every case awaits: the mirror is a `MutationObserver`, because React Aria renders its collection
 * after the table's own layout effect and a row re-renders without the table doing so. Observer
 * callbacks are microtasks, so the attribute lands a tick after the render — which is why the
 * browser spec's auto-retrying assertions see it and a synchronous read would not.
 */
function renderGrid(config: Record<string, unknown> = {}) {
	return render(
		<DataGrid
			data={ROWS}
			columns={COLUMNS}
			{...config}
		/>,
	)
}

describe('ARIA state survives React Aria', () => {
	it('puts aria-sort on the column header', async () => {
		const { container } = renderGrid({ sorting: true, initialState: { sorting: [{ id: 'name', desc: false }] } })

		await waitFor(() => {
			expect(container.querySelector('[data-column-id="name"]')?.getAttribute('aria-sort')).toBe('ascending')
		})
	})

	it('puts aria-selected on the row, and follows the selection', async () => {
		const { container } = renderGrid({ selection: true, initialState: { rowSelection: { '1': true } } })

		await waitFor(() => {
			const rows = [...container.querySelectorAll('[data-slot="tbody"] [data-slot="tr"]')]
			expect(rows[0]?.getAttribute('aria-selected')).toBe('true')
			expect(rows[1]?.getAttribute('aria-selected')).toBe('false')
		})
	})

	it('puts aria-expanded on a row that expands', async () => {
		const { container } = renderGrid({
			expanding: { component: () => <div>detail</div> },
			initialState: { expanded: { '1': true } },
		})

		await waitFor(() => {
			const rowById = (id: string) => container.querySelector(`[data-slot="tbody"] [data-row-id="${id}"]`)
			expect(rowById('1')?.getAttribute('aria-expanded')).toBe('true')
			expect(rowById('2')?.getAttribute('aria-expanded')).toBe('false')
		})
	})

	it('puts aria-rowcount on the table when the page is not the whole set', async () => {
		const { container } = renderGrid({ pagination: { pageSize: 5 } })

		await waitFor(() => {
			// 12 rows plus the header row ARIA counts.
			expect(container.querySelector('[data-slot="table"]')?.getAttribute('aria-rowcount')).toBe('13')
		})
	})
})
