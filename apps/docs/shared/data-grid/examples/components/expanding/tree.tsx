'use client'

import { defineColumns } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type OrgNode = {
	id: number
	name: string
	role: string
	headcount: number
	children?: OrgNode[]
}

const ORG_DATA: OrgNode[] = [
	{
		id: 1,
		name: 'Engineering',
		role: 'Department',
		headcount: 24,
		children: [
			{
				id: 11,
				name: 'Frontend',
				role: 'Team',
				headcount: 8,
				children: [
					{ id: 111, name: 'Alice Johnson', role: 'Senior Engineer', headcount: 1 },
					{ id: 112, name: 'Tom Lee', role: 'Engineer', headcount: 1 },
				],
			},
			{
				id: 12,
				name: 'Backend',
				role: 'Team',
				headcount: 10,
				children: [
					{ id: 121, name: 'Carlos Mendez', role: 'Lead Engineer', headcount: 1 },
					{ id: 122, name: 'Sara Kim', role: 'Engineer', headcount: 1 },
				],
			},
			{
				id: 13,
				name: 'Infrastructure',
				role: 'Team',
				headcount: 6,
				children: [{ id: 131, name: 'Eve Davis', role: 'DevOps Engineer', headcount: 1 }],
			},
		],
	},
	{
		id: 2,
		name: 'Product',
		role: 'Department',
		headcount: 10,
		children: [
			{ id: 21, name: 'Bob Smith', role: 'Product Manager', headcount: 1 },
			{ id: 22, name: 'Mia Chen', role: 'Product Manager', headcount: 1 },
		],
	},
	{
		id: 3,
		name: 'Design',
		role: 'Department',
		headcount: 6,
		children: [
			{ id: 31, name: 'Carol White', role: 'Lead Designer', headcount: 1 },
			{ id: 32, name: 'Jake Moore', role: 'Designer', headcount: 1 },
		],
	},
]

const columns = defineColumns<OrgNode>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
	{ accessorKey: 'headcount', header: 'Headcount', cell: { type: 'number' } },
])

export function ExpandingTreeExample() {
	const table = useDataGrid({
		data: ORG_DATA,
		columns,
		expanding: {
			variant: 'tree',
		},
	})

	return <DataGrid table={table} />
}
