'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function RowPinningInitialExample() {
	const [data] = useState(() => makeUsers(60))

	return (
		<DataGrid
			data={data}
			columns={columns}
			pinning={{ row: { top: true, bottom: true } }}
			initialState={{ rowPinning: { top: ['3'], bottom: ['58'] } }}
			layout={{ stickyHeader: true, maxHeight: '24rem' }}
		/>
	)
}
