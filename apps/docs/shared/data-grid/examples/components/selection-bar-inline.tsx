'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

export function SelectionBarInlineExample() {
	const [data, setData] = useState(INITIAL_DATA)
	const [log, setLog] = useState<string[]>([])

	const addLog = (msg: string) => {
		setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 5))
	}

	// One action, two places: the row's overflow menu and the selection bar take the same entry
	// shape, so it is written once here and each kit draws it with its own chrome.
	const exportAction = (names: string[]) => ({
		id: 'export',
		label: 'Export',
		onSelect: () => {
			addLog(`Export triggered: ${names.join(', ')}`)
		},
	})

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
						variant: 'inline',
						clear: ({ clearSelection }) => {
							clearSelection()
							addLog('Selection cleared')
						},
						// Data, not markup: the kit draws the button, so it matches the Delete beside it.
						// The same entry shape `rowActions.actions` takes — see `exportAction` above.
						actions: ({ selectedRows }) => [exportAction(selectedRows.map((row) => row.original.name))],
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
