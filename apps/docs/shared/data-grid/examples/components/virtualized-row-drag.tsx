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
	{ accessorKey: 'id', header: '#', width: 80 },
	{ accessorKey: 'name', header: 'Task' },
	{ accessorKey: 'owner', header: 'Owner' },
] as never)

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
