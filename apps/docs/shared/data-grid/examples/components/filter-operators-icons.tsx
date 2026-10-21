'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { DEFAULT_OPERATOR_ICONS, defaultOperators } from '@ez-kit/data-grid-core/operators'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

import type { OperatorsConfig } from '@ez-kit/data-grid-core'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

const operators: OperatorsConfig = {
	byType: {
		text: defaultOperators.byType.text.map((op) => ({ ...op, icon: DEFAULT_OPERATOR_ICONS[op.id] })),
		number: defaultOperators.byType.number.map((op) => ({ ...op, icon: DEFAULT_OPERATOR_ICONS[op.id] })),
	},
}

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
	{ accessorKey: 'department', header: 'Department', filtering: { operators: false } },
])

export function FilterOperatorsIconsExample() {
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
