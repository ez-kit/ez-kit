'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseSelectionExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		selection: true,
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 25] },
	})

	return <DataGrid table={table} />
}
