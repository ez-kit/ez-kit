'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

import type { TableState } from '@ez-kit/data-grid-react'

type ControlledState = Pick<TableState, 'sorting' | 'pagination'>

export function ControlledStateExample() {
	const [tableState, setTableState] = useState<Partial<ControlledState>>({
		sorting: [{ id: 'name', desc: false }],
		pagination: { pageIndex: 0, pageSize: 3 },
	})

	const table = useDataGrid({
		data: INITIAL_DATA,
		columns,
		sorting: true,
		pagination: true,
		state: tableState,
		onStateChange: (updater) => {
			setTableState((prev) =>
				typeof updater === 'function' ? updater(prev as TableState) : updater,
			)
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
