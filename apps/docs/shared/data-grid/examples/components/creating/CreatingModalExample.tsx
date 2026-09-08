'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function CreatingModalExample() {
	const [data, setData] = useState(INITIAL_DATA)

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			pagination={{ pageSize: 10 }}
			creating={{
				mode: 'modal',
				onSave: ({ values }) => {
					setData((prev) => [...prev, { id: Date.now(), ...values } as User])
				},
			}}
		/>
	)
}
