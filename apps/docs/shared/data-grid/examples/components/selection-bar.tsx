'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

export function SelectionBarExample() {
	const [data, setData] = useState(INITIAL_DATA)
	const [log, setLog] = useState<string[]>([])

	const addLog = (msg: string) => {
		setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 5))
	}

	return (
		<div>
			<DataGrid
				data={data}
				columns={columns}
				sorting
				pagination={{ pageSize: 10 }}
				deleting={{
					onDelete: ({ row }) => {
						setData((prev) => prev.filter((r) => r !== row.original))
						addLog(`Deleted: ${row.original.name}`)
					},
					bulk: {
						onDelete: ({ rows }) => {
							const names = rows.map((r) => r.original.name).join(', ')
							setData((prev) => prev.filter((row) => !rows.some((r) => r.original === row)))
							addLog(`Deleted: ${names}`)
						},
					},
				}}
				selection={{
					bar: {
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
									// The background is hardcoded, so the text colour must be too — otherwise it
									// inherits the bar's foreground and goes white-on-white in the dark theme.
									color: '#0f172a',
									cursor: 'pointer',
								}}
							>
								Export
							</button>
						),
					},
				}}
			/>

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
