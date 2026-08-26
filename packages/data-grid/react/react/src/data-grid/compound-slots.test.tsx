import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { createDataGridInstance } from '../data-grid-instance'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; amount: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', amount: 10 },
	{ id: 2, name: 'Bob', amount: 32 },
]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', footer: 'Total' },
	{ accessorKey: 'amount', header: 'Amount', footer: () => '42' },
])

function makeInstance() {
	return createDataGridInstance(createTable<User>({ data: USERS, columns: COLUMNS }))
}

/**
 * `ColumnDef.footer` reached TanStack long before anything rendered it — the built-in layout
 * had no `<tfoot>` slot at all, so a totals row had to be built outside the table element.
 */
describe('<DataGrid.Footer>', () => {
	it('is not part of the default layout', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance()} />)
		expect(container.querySelector('tfoot')).toBeNull()
	})

	it('renders one cell per column from the column footers', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body />
					<DataGrid.Footer />
				</DataGrid.Table>
			</DataGrid>,
		)
		const cells = container.querySelectorAll('tfoot td')
		expect(Array.from(cells).map((c) => c.textContent)).toEqual(['Total', '42'])
	})

	it('hands the render function the table and its footer groups', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Body />
					<DataGrid.Footer>
						{({ table, footerGroups }) => (
							<tr>
								<td colSpan={footerGroups[0]?.headers.length}>{table.getRowModel().rows.length} rows</td>
							</tr>
						)}
					</DataGrid.Footer>
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(container.querySelector('tfoot td')?.textContent).toBe('2 rows')
		expect(container.querySelector('tfoot td')?.getAttribute('colspan')).toBe('2')
	})
})

/**
 * Header used to be the one structural slot with no escape hatch: customising the header row
 * meant replacing the whole `<DataGrid.Table>` body, which also gave up pinning, sticky
 * positioning and virtualization.
 */
describe('<DataGrid.Header> children', () => {
	it('renders the built-in header rows when no children are supplied', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance()} />)
		expect(Array.from(container.querySelectorAll('thead th')).map((c) => c.textContent)).toEqual(['Name', 'Amount'])
	})

	it('replaces the header rows with a render function, keeping the kit thead', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<tr key={group.id}>
									{group.headers.map((header) => (
										<th key={header.id}>{header.column.id.toUpperCase()}</th>
									))}
								</tr>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(Array.from(container.querySelectorAll('thead th')).map((c) => c.textContent)).toEqual(['NAME', 'AMOUNT'])
		expect(container.querySelector('thead')?.getAttribute('data-slot')).toBe('thead')
	})

	it('accepts plain element children too', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header>
						<tr>
							<th>Custom</th>
						</tr>
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(container.querySelector('thead th')?.textContent).toBe('Custom')
	})
})
