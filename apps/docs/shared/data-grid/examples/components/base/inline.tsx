'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseInlineExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			pagination={{ pageSize: 10 }}
			pageSizer={{ items: [5, 10, 25] }}
		/>
	)
}
