'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowOrderingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { RowDragHandle } from 'shared/data-grid-dnd/handle'
import { DataGridDnd } from 'shared/DataGridDnd'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnOrderingFeature,
	rowOrderingFeature,
})

const VIRTUAL_ROW_COUNT = 10_000

type Task = { id: number; name: string; owner: string }

const columns = createColumns<Task>([
	{ id: 'drag', header: '', width: 48, align: 'center', cell: { component: () => <RowDragHandle /> } },
	{ accessorKey: 'id', header: '#', width: 80 },
	{ accessorKey: 'name', header: 'Task' },
	{ accessorKey: 'owner', header: 'Owner' },
] as never)

/**
 * Dragging a row in a **virtualized** grid — ten thousand rows, a window of a few dozen.
 *
 * The case the whole of phase 9 is about: a windowed body renders a slice, so what a row can honestly
 * report as its index, and what stays mounted while the pointer moves, are both different from the
 * non-virtual grid.
 */
export function VirtualizedRowDragExample() {
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
		<div className='flex flex-col gap-2'>
			<DataGridDnd
				features={features}
				data={data}
				columns={columns}
				getRowId={(row: Task) => String(row.id)}
				layout={{ stickyHeader: true, maxHeight: '420px' }}
				virtualization={{ row: { estimateSize: 49, overscan: 10 } }}
				ordering={{ row: true }}
			/>
		</div>
	)
}
