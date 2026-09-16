'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseSelectionExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			selection
			pagination={{ pageSize: 10, items: [5, 10, 25] }}
		/>
	)
}
