'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BasePlainExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 25] }}
		/>
	)
}
