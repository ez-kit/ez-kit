import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { OUTSIDE } from '../outside'

import { columns } from './columns'
import { useData } from './use-data'

export function EntryExample() {
	const [open] = useState(false)
	const rows = useData()
	return (
		<div
			data-title={OUTSIDE}
			data-open={open}
		>
			<DataGrid
				columns={columns}
				data={rows}
			/>
		</div>
	)
}
