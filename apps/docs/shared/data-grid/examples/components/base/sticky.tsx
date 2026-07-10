'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseStickyExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		stickyHeader: true,
		pagination: { pageSize: 25 },
		pageSizer: { items: [10, 25, 50] },
	})

	return <DataGrid table={table} />
}
