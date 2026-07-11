'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Milestone = {
	id: number
	title: string
	dueDate: string
	completedAt: string | undefined
}

const INITIAL_DATA: Milestone[] = [
	{ id: 1, title: 'Design review', dueDate: '2026-01-15', completedAt: '2026-01-12' },
	{ id: 2, title: 'API contract freeze', dueDate: '2026-02-01', completedAt: undefined },
	{ id: 3, title: 'Beta rollout', dueDate: '2026-03-10', completedAt: undefined },
	{ id: 4, title: 'Security audit', dueDate: '2025-11-20', completedAt: '2025-12-04' },
	{ id: 5, title: 'GA release', dueDate: '2026-05-01', completedAt: undefined },
	{ id: 6, title: 'Retrospective', dueDate: '2026-05-15', completedAt: undefined },
]

const baseColumns = defineColumns<Milestone>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'dueDate',
		header: 'Due date',
		cell: {
			type: 'date',
			config: { format: { dateStyle: 'medium' }, minValue: '2025-01-01', maxValue: '2027-12-31' },
		},
		filtering: { operators: true },
	},
	{
		accessorKey: 'completedAt',
		header: 'Completed at',
		cell: {
			type: 'date',
			config: { format: { dateStyle: 'short' } },
		},
		filtering: {
			operators: {
				items: ['eq', 'before', 'after', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

export function DateCellViewExample() {
	const table = useDataGrid({ data: INITIAL_DATA, columns: baseColumns, filtering: true })
	return <DataGrid table={table} />
}

export function DateCellEditExample() {
	const [rows, setRows] = useState<Milestone[]>(INITIAL_DATA)
	const table = useDataGrid({
		data: rows,
		columns: baseColumns,
		getRowId: (row) => String(row.id),
		filtering: true,
		editing: {
			mode: 'cell',
			onSave: ({ rowId, values }) => {
				setRows((prev) => prev.map((row) => (String(row.id) === rowId ? { ...row, ...values } : row)))
			},
		},
	})
	return <DataGrid table={table} />
}

export function DateCellCreateExample() {
	const [rows, setRows] = useState<Milestone[]>(INITIAL_DATA)
	const table = useDataGrid({
		data: rows,
		columns: baseColumns,
		getRowId: (row) => String(row.id),
		creating: {
			mode: 'row',
			onSave: ({ values }) => {
				const next = values as Partial<Omit<Milestone, 'id'>>
				setRows((prev) => [
					...prev,
					{
						id: prev.length + 1,
						title: next.title ?? '',
						dueDate: next.dueDate ?? '',
						completedAt: next.completedAt,
					},
				])
			},
		},
	})
	return <DataGrid table={table} />
}
