'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, DataGrid } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { ColumnDragHandle } from 'shared/data-grid-dnd/handle'
import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnOrderingFeature,
	columnResizingFeature,
})

const columns = createColumns<Employee>([
	{ header: 'Ref', columns: [{ accessorKey: 'id', header: 'Id', width: 80, ordering: false }] },
	{
		header: 'Details',
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'department', header: 'Department' },
			{ accessorKey: 'joinedAt', header: 'Joined' },
		],
	},
	{ header: 'Money', columns: [{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } }] },
] as never)

function ColumnDragGrid({ rtl }: { rtl?: boolean }) {
	const [moves, setMoves] = useState(0)

	return (
		<div className='flex flex-col gap-2'>
			<span className='text-sm text-muted-foreground'>
				Columns moved <span data-testid='column-drag-commits'>{moves}</span>
			</span>
			<DataGridDnd
				features={features}
				data={EMPLOYEE_DATA.slice(0, 5)}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				{...(rtl ? { direction: 'rtl' } : {})}
				resizing
				ordering={{
					column: {
						onChange: () => {
							setMoves((count) => count + 1)
						},
					},
				}}
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												{({ sortTrigger, menu }) => (
													<DataGrid.HeaderMain>
														<ColumnDragHandle />
														{sortTrigger}
														{menu}
													</DataGrid.HeaderMain>
												)}
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGridDnd>
		</div>
	)
}

export function ColumnDragExample() {
	return <ColumnDragGrid />
}

export function ColumnDragRtlExample() {
	return (
		<div dir='rtl'>
			<ColumnDragGrid rtl />
		</div>
	)
}
