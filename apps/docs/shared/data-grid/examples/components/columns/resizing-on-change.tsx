'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, resizableColumns } from '../_data'

export function ResizingOnChangeExample() {
	const [data] = useState(INITIAL_DATA)

	return (
		<DataGrid
			data={data}
			columns={resizableColumns}
			sorting
			sizing={{ mode: 'onChange' }}
		/>
	)
}
