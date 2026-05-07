'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import type { TableState } from '@ez-kit/data-grid-react'

type Employee = {
	id: number
	name: string
	role: string
	department: string
	notes: string
}

const EMPLOYEES: Employee[] = [
	{
		id: 1,
		name: 'Alice Johnson',
		role: 'Senior Engineer',
		department: 'Engineering',
		notes: 'On-call rotation lead. Prefers async communication.',
	},
	{
		id: 2,
		name: 'Bob Smith',
		role: 'Product Manager',
		department: 'Product',
		notes: 'Owns the roadmap for Q3. Weekly sync every Tuesday.',
	},
	{
		id: 3,
		name: 'Carol White',
		role: 'Designer',
		department: 'Design',
		notes: 'Design system maintainer. Figma token updates in progress.',
	},
	{
		id: 4,
		name: 'Dave Brown',
		role: 'Data Analyst',
		department: 'Analytics',
		notes: 'Monthly reporting due on the 5th. Warehouse access required.',
	},
]

const columns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
	{ accessorKey: 'department', header: 'Department' },
])

export function ExpandingControlledExample() {
	const [tableState, setTableState] = useState<Partial<TableState>>({ expanded: {} })
	const expanded = (tableState.expanded ?? {}) as Record<string, boolean>
	const allIds = EMPLOYEES.map((_, i) => String(i))
	const allExpanded = allIds.every((id) => expanded[id])

	const table = useDataGrid({
		data: EMPLOYEES,
		columns,
		state: tableState,
		onStateChange: (updater) => {
			setTableState((prev) => (typeof updater === 'function' ? updater(prev as TableState) : updater))
		},
		expanding: {
			renderExpanded: ({ row }) => (
				<div>
					<span style={{ fontWeight: 600 }}>Notes: </span>
					{row.original.notes}
				</div>
			),
		},
	})

	return (
		<div>
			<div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
				<button
					type='button'
					onClick={() => {
						setTableState((prev) => ({
							...prev,
							expanded: Object.fromEntries(allIds.map((id) => [id, true])),
						}))
					}}
					disabled={allExpanded}
				>
					Expand all
				</button>
				<button
					type='button'
					onClick={() => {
						setTableState((prev) => ({ ...prev, expanded: {} }))
					}}
					disabled={Object.keys(expanded).length === 0}
				>
					Collapse all
				</button>
			</div>
			<DataGrid table={table} />
		</div>
	)
}
