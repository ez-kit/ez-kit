'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, resizableColumns } from './_data'

export function ResizingExample() {
	const [data] = useState(INITIAL_DATA)

	const onChange = useDataGrid({
		data,
		columns: resizableColumns,
		sorting: true,
		sizing: { mode: 'onChange' },
	})

	const onEnd = useDataGrid({
		data,
		columns: resizableColumns,
		sorting: true,
		sizing: { mode: 'onEnd' },
	})

	return (
		<div>
			<h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>onChange</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Drag column borders to resize. Double-click to reset. &quot;Active&quot; column has resizing disabled.
			</p>
			<DataGrid table={onChange} />

			<h2 style={{ marginTop: '3rem', marginBottom: '0.5rem' }}>onEnd (performant)</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Width updates only after mouse release. No re-renders during drag.
			</p>
			<DataGrid table={onEnd} />
		</div>
	)
}
