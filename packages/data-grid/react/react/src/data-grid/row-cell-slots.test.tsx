import { createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES, renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { DataGridCellProps } from './cell'

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
				features={TEST_FEATURES}
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
				features={TEST_FEATURES}
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

/**
 * Supplying `children` used to be an all-or-nothing cliff: the cell's own content was resolved by
 * a branch the custom path never reached, so a caller who wanted the default *plus* something had
 * to re-implement the cell-type lookup by hand. `content` is that resolved node, handed back.
 */
describe('DataGrid.Cell — content', () => {
	// Row-erased on purpose: the compound children below come from `<DataGrid.Body>` / `<DataGrid.Row>`
	// without an explicit `<User>`, so their `cell` and `row` are `ErasedRow` — the default this
	// type carries. Naming `User` here would type the helper against a grid this test never builds.
	function renderCell(children: DataGridCellProps['children']) {
		return renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				selection
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
												{children}
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
	}

	it('hands back what the cell would have rendered, so children can wrap it', () => {
		const { container } = renderCell(({ content }) => <em data-testid='wrap'>{content}</em>)

		const wrapped = container.querySelectorAll('[data-testid="wrap"]')
		// One per cell, selection column included — every branch resolves a `content`.
		expect(wrapped).toHaveLength(3)
		expect(container.querySelector('[data-slot="td"]:nth-child(2)')?.textContent).toBe('Ada')
	})

	it('resolves the system column control as content too', () => {
		const { container } = renderCell(({ content }) => <span data-testid='sys'>{content}</span>)

		const selectionCell = container.querySelector('[data-slot="td"]')
		expect(selectionCell?.querySelector('[data-testid="sys"] input[type="checkbox"]')).not.toBeNull()
	})

	// Regression: `cellClassName` was resolved in two of the four places a `Td` is rendered, so a
	// column's class survived a custom cell and a plain view cell but vanished the moment the cell
	// opened for editing — and never reached a system column at all. It is chrome now, like the
	// pin offset beside it, so every branch wears it.
	it('keeps the column class whichever branch renders the cell', () => {
		const { container } = renderCell(({ content }) => content)

		expect(container.querySelector('.age-cell')).not.toBeNull()
	})
})

describe('DataGrid.Row — content', () => {
	it('hands back the default cells, so a custom row can add to them', () => {
		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
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
									{({ content }) => (
										<>
											{content}
											<td
												data-slot='td'
												data-testid='extra'
											/>
										</>
									)}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		const row = container.querySelector('[data-slot="tr"][data-row-id]')
		// The two column cells the grid would have built, plus the one this row appended.
		expect(row?.querySelectorAll('[data-slot="td"]')).toHaveLength(3)
		expect(row?.textContent).toContain('Ada')
		expect(row?.querySelector('[data-testid="extra"]')).not.toBeNull()
	})
})
