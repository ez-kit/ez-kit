'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

interface Employee {
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

const textOperatorColumns = defineColumns<Employee>([
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
])

const numberOperatorColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: { operators: true, defaultOperator: 'gte' },
	},
])

const betweenInputsColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

const betweenSliderColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'slider', min: 50000, max: 130000 },
			},
		},
	},
])

const dateOperatorColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true },
	},
])

const dateBetweenColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['eq', 'before', 'after', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

function TextOperatorsDemo() {
	const table = useDataGrid({ data: DATA, columns: textOperatorColumns, filtering: true })
	return <DataGrid table={table} />
}

function NumberOperatorsDemo() {
	const table = useDataGrid({ data: DATA, columns: numberOperatorColumns, filtering: true })
	return <DataGrid table={table} />
}

function BetweenInputsDemo() {
	const table = useDataGrid({ data: DATA, columns: betweenInputsColumns, filtering: true })
	return <DataGrid table={table} />
}

function BetweenSliderDemo() {
	const table = useDataGrid({ data: DATA, columns: betweenSliderColumns, filtering: true })
	return <DataGrid table={table} />
}

function DateOperatorsDemo() {
	const table = useDataGrid({ data: DATA, columns: dateOperatorColumns, filtering: true })
	return <DataGrid table={table} />
}

function DateBetweenDemo() {
	const table = useDataGrid({ data: DATA, columns: dateBetweenColumns, filtering: true })
	return <DataGrid table={table} />
}

const SUB_TABS = [
	{ id: 'text', label: 'Text operators', Component: TextOperatorsDemo },
	{ id: 'number', label: 'Number operators', Component: NumberOperatorsDemo },
	{ id: 'between-inputs', label: 'Between (inputs)', Component: BetweenInputsDemo },
	{ id: 'between-slider', label: 'Between (slider)', Component: BetweenSliderDemo },
	{ id: 'date', label: 'Date operators', Component: DateOperatorsDemo },
	{ id: 'date-between', label: 'Date between', Component: DateBetweenDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function FilterOperatorsExample() {
	const [active, setActive] = useState<SubTabId>('text')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Demonstrates per-column filter operators — text contains/equals/isEmpty, number comparisons, between with inputs
				and slider, and date operators.
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
