'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowOrderingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { applyRowMove, createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'
import type { RowMove } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowOrderingFeature,
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

const getRowId = (row: Employee) => String(row.id)

export function RowDragExample() {
	const [data, setData] = useState(EMPLOYEE_DATA.slice(0, 8))
	const [moves, setMoves] = useState(0)

	return (
		<div className='flex flex-col gap-2'>
			<span className='text-sm text-muted-foreground'>
				Rows moved <span data-testid='row-drag-commits'>{moves}</span>
			</span>
			<DataGridDnd
				features={features}
				data={data}
				columns={columns}
				getRowId={getRowId}
				ordering={{
					row: {
						onChange: (move: RowMove) => {
							setMoves((count) => count + 1)
							setData((rows) => applyRowMove(rows, move, getRowId))
						},
					},
				}}
			/>
		</div>
	)
}
