'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

const EMPTY_DATA: typeof INITIAL_DATA = []

type Mode = 'loading' | 'empty' | 'no-results' | 'normal'

const MODE_LABELS: Record<Mode, string> = {
	loading: 'Loading',
	empty: 'Empty data',
	'no-results': 'No results',
	normal: 'Normal',
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
	return (
		<button
			type='button'
			onClick={onClick}
			style={{
				padding: '0.375rem 0.875rem',
				fontSize: 13,
				fontWeight: active ? 600 : 400,
				borderRadius: 6,
				border: active ? '1px solid #6366f1' : '1px solid #e2e8f0',
				background: active ? '#6366f1' : 'white',
				color: active ? 'white' : '#475569',
				cursor: 'pointer',
				transition: 'all 120ms',
			}}
		>
			{children}
		</button>
	)
}

export function FallbacksExample() {
	const [mode, setMode] = useState<Mode>('loading')

	const table = useDataGrid({
		data: mode === 'empty' ? EMPTY_DATA : INITIAL_DATA,
		columns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 5 },
		state: {
			loading: { isPending: mode === 'loading', isFetching: false, isError: false, error: null },
			// Reset column filters when leaving 'no-results' mode
			...(mode !== 'no-results' ? { columnFilters: [] } : {}),
		},
	})

	return (
		<div>
			<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
				{(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
					<TabButton
						key={m}
						active={mode === m}
						onClick={() => {
							setMode(m)
						}}
					>
						{MODE_LABELS[m]}
					</TabButton>
				))}
			</div>

			{mode === 'no-results' && (
				<p style={{ marginBottom: '0.75rem', fontSize: 13, color: '#64748b' }}>
					Type something that matches no rows in the filter inputs below column headers.
				</p>
			)}

			<DataGrid table={table} />
		</div>
	)
}
