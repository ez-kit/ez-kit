import { createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; age: number }

const DATA: User[] = [{ id: 1, name: 'Ada', age: 36 }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age', cellClassName: 'age-cell' },
])

/**
 * The composition ladder used to stop at `<DataGrid.Body>`: overriding anything below it meant
 * rebuilding the row and cell shells by hand, and with them the pinning offsets, the structural
 * `data-*` attributes and the column classes the stylesheet targets.
 */
describe('DataGrid.Row / DataGrid.Cell slots', () => {
	it('Row children replace the cells while keeping the row shell', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
			>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{({ cells }) =>
										cells.slice(0, 1).map((cell) => (
											<DataGrid.Cell
												key={cell.id}
												cell={cell}
												row={row}
											>
												only one cell
											</DataGrid.Cell>
										))
									}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		const row = container.querySelector('[data-slot="tr"][data-row-id]')
		expect(row).not.toBeNull()
		expect(row?.querySelectorAll('[data-slot="td"]')).toHaveLength(1)
		expect(row?.textContent).toBe('only one cell')
	})

	it('Cell children get the resolved value and keep the cell shell', () => {
		const { container } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
			>
				<DataGrid.Table>
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{({ cells }) =>
										cells.map((cell) => (
											<DataGrid.Cell
												key={cell.id}
												cell={cell}
												row={row}
											>
												{({ value }) => <b>{String(value)}</b>}
											</DataGrid.Cell>
										))
									}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		const cells = container.querySelectorAll('[data-slot="td"]')
		expect(cells).toHaveLength(2)
		expect(cells[0]?.textContent).toBe('Ada')
		expect(cells[1]?.textContent).toBe('36')
		// The column's own class still applies to a hand-rendered cell.
		expect(cells[1]?.className).toContain('age-cell')
	})
})
