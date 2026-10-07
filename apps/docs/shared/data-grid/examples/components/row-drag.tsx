'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowOrderingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'
import type { RowMove } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	// Structural: the grid shell lays out a column grid, so it needs widths, visibility and pin
	// groups whatever else a table registers.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowOrderingFeature,
})

/**
 * No column for the handle: with row ordering on and a drag adapter bound, the grid puts the grip
 * in a `__drag__` system column of its own — first in the row, pinned, fixed in width.
 */
const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

export function RowDragExample() {
	const [data, setData] = useState(EMPLOYEE_DATA.slice(0, 8))
	const [moves, setMoves] = useState(0)

	return (
		<div className='flex flex-col gap-2'>
			{/*
			 * The spec reads the inner span, so its text has to stay the bare number — the label sits
			 * outside it. This example is on a docs page, where a stray `0` above a grid reads as a bug.
			 */}
			<span className='text-sm text-muted-foreground'>
				Rows moved <span data-testid='row-drag-commits'>{moves}</span>
			</span>
			<DataGridDnd
				features={features}
				data={data}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				ordering={{
					row: {
						onChange: (move: RowMove) => {
							setMoves((count) => count + 1)
							setData((rows) => {
								const from = rows.findIndex((row) => String(row.id) === move.rowId)
								const to = rows.findIndex((row) => String(row.id) === move.targetRowId)
								if (from === -1 || to === -1) return rows
								const next = rows.slice()
								const [moved] = next.splice(from, 1)
								if (moved) next.splice(to, 0, moved)
								return next
							})
						},
					},
				}}
			/>
		</div>
	)
}
