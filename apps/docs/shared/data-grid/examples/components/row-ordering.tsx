'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createPaginatedRowModel,
	rowExpandingFeature,
	rowOrderingFeature,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { applyRowMove, createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowExpandingFeature,
	rowOrderingFeature,
	rowPaginationFeature,
	expandedRowModel: createExpandedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

const getRowId = (row: Employee) => String(row.id)

export function RowOrderingExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
		/>
	)
}

export function RowOrderingControlledExample() {
	const [rows, setRows] = useState(EMPLOYEE_DATA)

	return (
		<DataGrid
			features={features}
			data={rows}
			columns={columns}
			getRowId={getRowId}
			ordering={{
				row: {
					onChange: (move) => {
						setRows((current) => applyRowMove(current, move, getRowId))
					},
				},
			}}
		/>
	)
}

type Team = {
	id: number
	name: string
	department: string
	members?: Team[]
}

const TEAM_DATA: Team[] = [
	{
		id: 1,
		name: 'Frontend',
		department: 'Engineering',
		members: [
			{ id: 11, name: 'Alice Johnson', department: 'Engineering' },
			{ id: 12, name: 'Tom Lee', department: 'Engineering' },
		],
	},
	{
		id: 2,
		name: 'Backend',
		department: 'Engineering',
		members: [
			{ id: 21, name: 'Carlos Mendez', department: 'Engineering' },
			{ id: 22, name: 'Sara Kim', department: 'Engineering' },
		],
	},
]

const teamColumns = createColumns<Team>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
])

export function RowOrderingPaginatedExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
			pagination={{ pageSize: 4 }}
		/>
	)
}

export function RowOrderingTreeExample() {
	return (
		<DataGrid
			features={features}
			data={TEAM_DATA}
			columns={teamColumns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
			expanding={{ mode: 'tree', getSubRows: (row) => row.members }}
		/>
	)
}
