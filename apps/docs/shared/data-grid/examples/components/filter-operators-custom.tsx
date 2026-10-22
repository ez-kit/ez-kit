'use client'

import { OperatorInput } from '@ez-kit/data-grid-core'
import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

import type { FilterOperatorDef, OperatorsConfig } from '@ez-kit/data-grid-core'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

const notBetween: FilterOperatorDef<number> = {
	id: 'notBetween',
	label: 'Not between',
	input: OperatorInput.Range,
	filterFn: (rowValue, { from, to }) => {
		const salary = Number(rowValue)
		return (from !== undefined && salary < from) || (to !== undefined && salary > to)
	},
}

const isActive: FilterOperatorDef = {
	id: 'isActive',
	label: 'Is active',
	input: OperatorInput.None,
	filterFn: (rowValue) => rowValue === true,
}

const operators: OperatorsConfig = {
	byType: {
		number: [...defaultOperators.byType.number, notBetween],
		boolean: [isActive, ...defaultOperators.byType.boolean],
	},
}

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' }, filtering: { defaultOperator: 'notBetween' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export function FilterOperatorsCustomExample() {
	return (
		<DataGrid
			features={features}
			operators={operators}
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering={{ operators: true }}
		/>
	)
}
