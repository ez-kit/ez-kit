'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const SALARY_SLIDER_MIN = 50000
const SALARY_SLIDER_MAX = 130000

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['equals', 'between'],
				betweenOperator: { variant: 'slider', min: SALARY_SLIDER_MIN, max: SALARY_SLIDER_MAX },
			},
		},
	},
])

export function FilterOperatorsBetweenSliderExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering
		/>
	)
}
