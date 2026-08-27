'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid } from 'shared/data-grid/CustomGrid'

import type { CustomCellTypes } from 'shared/data-grid/custom-cell-types'

type Member = {
	id: number
	name: string
	role: string
	team: string
}

const MEMBER_DATA: Member[] = [
	{ id: 1, name: 'Alice Johnson', role: 'Staff Engineer', team: 'Platform' },
	{ id: 2, name: 'Bob Smith', role: 'Product Designer', team: 'Design' },
	{ id: 3, name: 'Carol White', role: 'PM', team: 'Growth' },
	{ id: 4, name: 'Dave Brown', role: 'Frontend Engineer', team: 'Platform' },
	{ id: 5, name: 'Eve Davis', role: 'Account Executive', team: 'Sales' },
]

const memberColumns = createColumns<Member, CustomCellTypes>([
	{ accessorKey: 'name', header: 'Member', cell: { type: 'user' } },
	{ accessorKey: 'role', header: 'Role' },
	{ accessorKey: 'team', header: 'Team' },
])

export function CustomCellUserExample() {
	const [data, setData] = useState(MEMBER_DATA)

	return (
		<CustomDataGrid
			data={data}
			columns={memberColumns}
			sorting
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
		/>
	)
}
