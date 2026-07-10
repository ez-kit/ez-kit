'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function RowPinningStickyHeaderExample() {
	const [data] = useState(makeUsers(100))

	const table = useDataGrid({
		data,
		columns,
		pinning: { row: { top: true, bottom: true } },
		stickyHeader: true,
	})

	return <DataGrid table={table} />
}
