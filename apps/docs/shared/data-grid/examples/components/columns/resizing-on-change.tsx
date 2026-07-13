'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, resizableColumns } from '../_data'

export function ResizingOnChangeExample() {
	const [data] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns: resizableColumns,
		sorting: true,
		sizing: { mode: 'onChange' },
	})

	return <DataGrid table={table} />
}
