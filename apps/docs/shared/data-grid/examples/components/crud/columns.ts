import { defineColumns } from '@ez-kit/data-grid-react'

import type { Employee } from './use-employee-store'

export const crudColumns = defineColumns<Employee>([
	{
		accessorKey: 'name',
		header: 'Name',
		visibility: false,
		pinning: { defaultPin: 'left' },
		filtering: { operators: true },
	},
	{
		accessorKey: 'department',
		header: 'Department',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'Engineering', label: 'Engineering' },
					{ value: 'Marketing', label: 'Marketing' },
					{ value: 'Sales', label: 'Sales' },
					{ value: 'HR', label: 'HR' },
					{ value: 'Finance', label: 'Finance' },
					{ value: 'Design', label: 'Design' },
				],
			},
		},
		filtering: {
			operators: { items: ['contains', 'equals', 'isEmpty', 'isNotEmpty'] },
		},
	},
	{
		accessorKey: 'role',
		header: 'Role',
		filtering: { operators: true },
	},
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'slider', min: 40000, max: 200000 },
			},
		},
	},
	{
		accessorKey: 'startDate',
		header: 'Start Date',
		cell: { type: 'date' },
		filtering: { operators: true },
		visibility: { defaultHidden: true },
	},
	{
		accessorKey: 'active',
		header: 'Active',
		cell: { type: 'boolean' },
	},
])
