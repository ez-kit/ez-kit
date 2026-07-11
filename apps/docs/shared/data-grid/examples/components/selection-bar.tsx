'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

export function SelectionBarExample() {
	const [data, setData] = useState(INITIAL_DATA)
	const [log, setLog] = useState<string[]>([])

	const addLog = (msg: string) => {
		setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 5))
	}

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		pagination: { pageSize: 10 },
		selection: {
			panel: {
				onDelete: ({ selectedRows, clearSelection }) => {
					const names = selectedRows.map((r) => r.original.name).join(', ')
					setData((prev) => prev.filter((row) => !selectedRows.some((r) => r.original === row)))
					clearSelection()
					addLog(`Deleted: ${names}`)
				},
				onClear: ({ clearSelection }) => {
					clearSelection()
					addLog('Selection cleared')
				},
				actions: (
					<button
						type='button'
						onClick={() => {
							addLog('Export triggered')
						}}
						style={{
							padding: '0 10px',
							height: 28,
							fontSize: 12,
							border: '1px solid #e2e8f0',
							borderRadius: 6,
							background: 'white',
							cursor: 'pointer',
						}}
					>
						Export
					</button>
				),
			},
		},
	})

	return (
		<div>
			<DataGrid table={table} />

			{log.length > 0 && (
				<div
					style={{
						marginTop: '1.5rem',
						padding: '0.75rem 1rem',
						background: '#f8fafc',
						border: '1px solid #e2e8f0',
						borderRadius: 8,
						fontSize: 13,
						color: '#475569',
					}}
				>
					<div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>Action log</div>
					{log.map((entry, i) => (
						<div key={i}>{entry}</div>
					))}
				</div>
			)}
		</div>
	)
}
