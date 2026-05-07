'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Employee = {
	id: number
	name: string
	department: string
	salary: number
	joinedAt: string
	active: boolean
}

const DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 95000, joinedAt: '2021-03-15', active: true },
	{ id: 2, name: 'Bob Smith', department: 'Marketing', salary: 72000, joinedAt: '2020-07-01', active: false },
	{ id: 3, name: 'Carol White', department: 'Engineering', salary: 105000, joinedAt: '2019-11-20', active: true },
	{ id: 4, name: 'Dave Brown', department: 'Sales', salary: 68000, joinedAt: '2022-01-10', active: true },
	{ id: 5, name: 'Eve Davis', department: 'Engineering', salary: 88000, joinedAt: '2021-08-05', active: true },
	{ id: 6, name: 'Frank Lee', department: 'Marketing', salary: 61000, joinedAt: '2023-04-18', active: false },
	{ id: 7, name: 'Grace Kim', department: 'Sales', salary: 77000, joinedAt: '2020-12-30', active: true },
	{ id: 8, name: 'Hank Patel', department: 'Engineering', salary: 115000, joinedAt: '2018-06-25', active: true },
]

const basicColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
	{ accessorKey: 'joinedAt', header: 'Joined', cell: { type: 'date' } },
])

const withOperatorsColumns = defineColumns<Employee>([
	{
		accessorKey: 'name',
		header: 'Name',
		filtering: { operators: true },
	},
	{
		accessorKey: 'department',
		header: 'Department',
		filtering: { operators: { items: ['contains', 'equals', 'isEmpty', 'isNotEmpty'] } },
	},
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				betweenOperator: { variant: 'slider', min: 50000, max: 130000 },
			},
		},
	},
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true },
	},
])

function BasicDemo() {
	const table = useDataGrid({
		data: DATA,
		columns: basicColumns,
		filtering: { variant: 'popover' },
		sorting: true,
	})
	return <DataGrid table={table} />
}

function WithOperatorsDemo() {
	const table = useDataGrid({
		data: DATA,
		columns: withOperatorsColumns,
		filtering: { variant: 'popover' },
		sorting: true,
	})
	return <DataGrid table={table} />
}

const SUB_TABS = [
	{ id: 'basic', label: 'Basic', Component: BasicDemo },
	{ id: 'with-operators', label: 'With operators', Component: WithOperatorsDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function FilterPopoverExample() {
	const [active, setActive] = useState<SubTabId>('basic')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				A filter icon appears in each column header. Click it to open a popover with the filter input and operators. The
				icon turns primary colour when a filter is active.
			</p>

			<div
				style={{
					display: 'flex',
					gap: '0.25rem',
					flexWrap: 'wrap',
					borderBottom: '1px solid #e2e8f0',
					marginBottom: '1.5rem',
				}}
			>
				{SUB_TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => {
							setActive(t.id)
						}}
						style={{
							padding: '0.375rem 0.75rem',
							border: 'none',
							borderBottom: active === t.id ? '2px solid #0f172a' : '2px solid transparent',
							background: 'none',
							cursor: 'pointer',
							fontSize: '0.875rem',
							fontWeight: active === t.id ? 600 : 400,
							color: active === t.id ? '#0f172a' : '#64748b',
							marginBottom: '-1px',
						}}
					>
						{t.label}
					</button>
				))}
			</div>

			<tab.Component />
		</div>
	)
}
