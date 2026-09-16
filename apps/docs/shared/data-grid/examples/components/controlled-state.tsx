'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

import type { GridFeatures, TableState } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

type ControlledState = Pick<TableState<GridFeatures>, 'sorting' | 'pagination'>

export function ControlledStateExample() {
	const [tableState, setTableState] = useState<Partial<ControlledState>>({
		sorting: [{ id: 'name', desc: false }],
		pagination: { pageIndex: 0, pageSize: 3 },
	})

	const table = useDataGrid({
		features,
		data: INITIAL_DATA,
		columns,
		sorting: true,
		pagination: true,
		state: tableState,
		onStateChange: (nextState) => {
			setTableState(nextState)
		},
	})

	const resetSort = (): void => {
		setTableState((prev) => ({ ...prev, sorting: [] }))
	}

	const firstSort = tableState.sorting?.[0]
	const sortLabel = firstSort ? `${firstSort.id} ${firstSort.desc ? '↓' : '↑'}` : 'none'

	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
				<span style={{ fontSize: '0.875rem', color: '#666' }}>
					Active sort: <strong>{sortLabel}</strong>
				</span>
				<button
					onClick={resetSort}
					style={{
						padding: '0.25rem 0.75rem',
						fontSize: '0.875rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						background: 'white',
						cursor: 'pointer',
					}}
				>
					Reset sort
				</button>
			</div>
			<DataGrid table={table} />
		</div>
	)
}
