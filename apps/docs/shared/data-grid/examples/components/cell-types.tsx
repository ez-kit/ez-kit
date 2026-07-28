'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, productColumns, type Product } from './_data'

export function CellTypesExample() {
	const [data, setData] = useState(PRODUCT_DATA)

	return (
		<DataGrid
			data={data}
			columns={productColumns}
			sorting
			filtering
			pagination={{ pageSize: 10 }}
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
			creating={{
				mode: 'pin-row',
				onSave: ({ values }) => {
					setData((prev) => [...prev, values as Product])
				},
			}}
		/>
	)
}
