'use client'

import {
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	creatingFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	loadingFeature,
	rowExpandingFeature,
	rowOrderingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { makeEmployees } from './_data'

import type { Employee } from './_data'
import type { GridFeatures, TableState } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	columnOrderingFeature,
	rowOrderingFeature,
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowPinningFeature,
	rowExpandingFeature,
	editingFeature,
	creatingFeature,
	deletingFeature,
	loadingFeature,
	filterFns,
	sortFns,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	expandedRowModel: createExpandedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name', width: 180, filtering: { operators: true } },
	{ accessorKey: 'department', header: 'Department' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		align: 'end',
		cell: { type: 'number' },
		filtering: { operators: true, defaultOperator: 'greaterOrEqual' },
	},
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

const getRowId = (row: Employee) => String(row.id)

function EmployeeDetail({ row }: { row: { original: Employee } }) {
	return (
		<p className='text-sm'>
			{row.original.name} joined {row.original.department} on {row.original.joinedAt}.
		</p>
	)
}

type GridState = Partial<TableState<GridFeatures>>

export function ControlledStateFullExample() {
	const [data, setData] = useState(() => makeEmployees(24))
	const [state, setState] = useState<GridState>({
		pagination: { pageIndex: 0, pageSize: 5 },
	})

	return (
		<div className='flex flex-col gap-3'>
			<DataGridDnd
				features={features}
				data={data}
				columns={columns}
				getRowId={getRowId}
				state={state}
				onStateChange={setState}
				sorting
				filtering
				globalFiltering
				pagination={{ items: [5, 10, 20] }}
				selection
				visibility
				resizing
				pinning={{ column: true, row: true }}
				ordering={{ column: true, row: true }}
				expanding={{ component: EmployeeDetail }}
				editing={{
					mode: 'row',
					onSave: ({ rowId, values }: { rowId: string; values: Partial<Employee> }) => {
						setData((rows) => rows.map((row) => (getRowId(row) === rowId ? { ...row, ...values } : row)))
					},
				}}
				creating={{
					mode: 'modal',
					onSave: ({ values }: { values: Partial<Employee> }) => {
						setData((rows) => [...rows, { ...values, id: Math.max(...rows.map((row) => row.id)) + 1 } as Employee])
					},
				}}
				deleting={{
					onDelete: ({ rowId }: { rowId: string }) => {
						setData((rows) => rows.filter((row) => getRowId(row) !== rowId))
					},
					bulk: true,
				}}
			/>

			<pre
				aria-label='Grid state'
				className='bg-muted max-h-96 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed'
			>
				{JSON.stringify(state, null, 2)}
			</pre>
		</div>
	)
}
