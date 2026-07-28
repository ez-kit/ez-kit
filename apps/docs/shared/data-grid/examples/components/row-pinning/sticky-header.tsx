'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function RowPinningStickyHeaderExample() {
	const [data] = useState(makeUsers(100))

	return (
		<DataGrid
			data={data}
			columns={columns}
			pinning={{ row: { top: true, bottom: true } }}
			stickyHeader
		/>
	)
}
