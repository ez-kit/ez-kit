import { act, render, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'

import { createColumns, DataGrid, useDataGrid } from '../../data-grid'

import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from './table-adapters'

const DATA = [{ id: 1, name: 'Ann', team: 'Engineering' }]
const COLUMNS = createColumns<(typeof DATA)[number]>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'team', header: 'Team' },
])
const RETAINED_LAYOUT = (
	<TableScroll>
		<Table>
			<Thead>
				<Tr>
					<Th data-column-id='name'>Name</Th>
					<Th data-column-id='team'>Team</Th>
				</Tr>
			</Thead>
			<Tbody>
				<Tr id='1'>
					<Td>Ann</Td>
					<Td>Engineering</Td>
				</Tr>
			</Tbody>
		</Table>
	</TableScroll>
)

it('updates the row header of a retained Thead when the model order changes', async () => {
	let table: ReturnType<typeof useDataGrid<(typeof DATA)[number]>>
	function Harness() {
		table = useDataGrid({ data: DATA, columns: COLUMNS, ordering: { column: true } })
		return <DataGrid table={table}>{RETAINED_LAYOUT}</DataGrid>
	}
	const { getByRole } = render(<Harness />)
	await waitFor(() => {
		expect(getByRole('rowheader')).toHaveTextContent('Ann')
	})
	act(() => {
		table.setColumnOrder(['team', 'name'])
	})
	await waitFor(() => {
		expect(getByRole('rowheader')).toHaveTextContent('Engineering')
	})
	act(() => {
		table.setColumnOrder(['name', 'team'])
	})
	await waitFor(() => {
		expect(getByRole('rowheader')).toHaveTextContent('Ann')
	})
})
