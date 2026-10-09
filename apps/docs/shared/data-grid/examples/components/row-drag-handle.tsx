'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowOrderingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { applyRowMove, createColumns } from '@ez-kit/data-grid-react'
import { useMemo, useState } from 'react'

import { RowDragHandle } from 'shared/data-grid-dnd/handle'
import { DataGridDnd } from 'shared/DataGridDnd'

import { makeEmployees } from './_data'

import type { Employee } from './_data'
import type { RowMove } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowOrderingFeature,
})

const ROW_COUNT = 24

const SCROLLING_LAYOUT = { stickyHeader: true, maxHeight: '420px' }

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

function ValueWithHandle({ value }: { value: unknown }) {
	return (
		<span className='flex items-center gap-2'>
			<RowDragHandle />
			{String(value)}
		</span>
	)
}

const columnsWithHandle = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name', cell: { component: ValueWithHandle } },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

const getRowId = (row: Employee) => String(row.id)

export function RowDragDefaultExample() {
	const [data, setData] = useState(() => makeEmployees(ROW_COUNT))

	return (
		<DataGridDnd
			features={features}
			data={data}
			columns={columns}
			getRowId={getRowId}
			layout={SCROLLING_LAYOUT}
			ordering={{
				row: {
					onChange: (move: RowMove) => {
						setData((rows) => applyRowMove(rows, move, getRowId))
					},
				},
			}}
		/>
	)
}

export function RowDragHandleColumnExample() {
	return (
		<DataGridDnd
			features={features}
			data={makeEmployees(ROW_COUNT)}
			columns={columns}
			getRowId={getRowId}
			layout={SCROLLING_LAYOUT}
			ordering={{ row: { column: { header: 'Order', width: 72, pinning: 'end', align: 'center' } } }}
		/>
	)
}

export function RowDragCellHandleExample() {
	return (
		<DataGridDnd
			features={features}
			data={makeEmployees(ROW_COUNT)}
			columns={columnsWithHandle}
			getRowId={getRowId}
			layout={SCROLLING_LAYOUT}
			ordering={{ row: { column: false } }}
		/>
	)
}

const VIRTUAL_ROW_COUNT = 5_000

type Task = { id: number; name: string; owner: string }

const taskColumns = createColumns<Task>([
	{ accessorKey: 'name', header: 'Task', cell: { component: ValueWithHandle } },
	{ accessorKey: 'owner', header: 'Owner' },
	{ accessorKey: 'id', header: '#', width: 96, align: 'end' },
] as never)

export function VirtualizedRowDragCellHandleExample() {
	const data = useMemo(
		() =>
			Array.from({ length: VIRTUAL_ROW_COUNT }, (_, i) => ({
				id: i + 1,
				name: `Task ${String(i + 1)}`,
				owner: `Owner ${String((i % 12) + 1)}`,
			})),
		[],
	)

	return (
		<DataGridDnd
			features={features}
			data={data}
			columns={taskColumns}
			getRowId={(row: Task) => String(row.id)}
			layout={SCROLLING_LAYOUT}
			virtualization={{ row: { estimateSize: 49, overscan: 10 } }}
			ordering={{ row: { column: false } }}
		/>
	)
}
