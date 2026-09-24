'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

import { DataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

type Employee = {
	id: number
	name: string
	department: string
	role: string
	salary: number
	startDate: string
}

const DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', role: 'Engineer', salary: 95000, startDate: '2021-03-15' },
	{ id: 2, name: 'Bob Smith', department: 'Design', role: 'Designer', salary: 85000, startDate: '2020-07-01' },
	{ id: 3, name: 'Carol White', department: 'Engineering', role: 'Manager', salary: 110000, startDate: '2019-01-10' },
	{ id: 4, name: 'David Brown', department: 'Finance', role: 'Analyst', salary: 90000, startDate: '2022-05-20' },
	{ id: 5, name: 'Eve Davis', department: 'Engineering', role: 'Engineer', salary: 100000, startDate: '2021-11-08' },
	{ id: 6, name: 'Frank Miller', department: 'Design', role: 'Designer', salary: 82000, startDate: '2023-02-14' },
	{ id: 7, name: 'Grace Kim', department: 'Engineering', role: 'Engineer', salary: 92000, startDate: '2022-09-03' },
	{ id: 8, name: 'Henry Adams', department: 'Finance', role: 'Manager', salary: 120000, startDate: '2018-04-22' },
	{ id: 9, name: 'Iris Chen', department: 'Design', role: 'Designer', salary: 78000, startDate: '2023-06-30' },
	{ id: 10, name: 'Jack Wilson', department: 'Engineering', role: 'Engineer', salary: 88000, startDate: '2022-01-15' },
]

export function SortToolbarExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'department', header: 'Department' },
				{ accessorKey: 'role', header: 'Role' },
				{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
				{ accessorKey: 'startDate', header: 'Start Date', cell: { type: 'date' } },
			]}
			sorting
		>
			{/*
			 * The multi-sort builder, placed explicitly. It used to be `sorting: { toolbar: true }`
			 * — an option whose only job was to tell the default toolbar to mount this one
			 * component, which is what writing the component says instead.
			 *
			 * Naming `children` at all means composing the rest of the grid too, so the table is
			 * written out below — this grid registers no pagination, so there is nothing else. A
			 * grid that wants the standard shell with this control already in it reaches for
			 * `DefaultLayout`, which mounts it whenever sorting is on.
			 */}
			<DataGrid.Toolbar end={<DataGrid.SortMenuTrigger />} />
			<DataGrid.Table />
		</DataGrid>
	)
}
