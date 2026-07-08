'use client'

import { defineColumns } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const SALARY_SLIDER_MIN = 50000
const SALARY_SLIDER_MAX = 130000

const columns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'slider', min: SALARY_SLIDER_MIN, max: SALARY_SLIDER_MAX },
			},
		},
	},
])

export function FilterOperatorsBetweenSliderExample() {
	const table = useDataGrid({ data: EMPLOYEE_DATA, columns, filtering: true })
	return <DataGrid table={table} />
}
