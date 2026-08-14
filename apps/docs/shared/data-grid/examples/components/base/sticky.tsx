'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseStickyExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			stickyHeader
			pagination={{ pageSize: 25, pageSizeOptions: [10, 25, 50] }}
		/>
	)
}
