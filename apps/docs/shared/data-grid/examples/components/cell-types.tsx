'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, productColumns, type Product } from './_data'

export function CellTypesExample() {
	const [data, setData] = useState(PRODUCT_DATA)

	const table = useDataGrid({
		data,
		columns: productColumns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 10 },
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? ({ ...row, ...values }) : row)))
				return true
			},
		},
		creating: {
			mode: 'pin-row',
			onSave: (values) => {
				setData((prev) => [...prev, values as Product])
				return true
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Demonstrates select, badge, image, link, and progress cell types with editing and filtering.
			</p>
			<DataGrid table={table} />
		</div>
	)
}
