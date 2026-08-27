'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseColumnVisibilityExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			visibility={{ toolbar: true }}
			pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 25] }}
		/>
	)
}
