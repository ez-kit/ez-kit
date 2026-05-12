'use client'

import { createTypedDataGrid } from '@ez-kit/data-grid-core'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

const typed = createTypedDataGrid<User>()

export function CreatingTypedExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = typed.create({
		data,
		columns,
		creating: {
			mode: 'modal',
			onSave: (values) => {
				// `values` is `Partial<User>` — `name`, `email`, `age`, `active` are typed.
				setData((prev) => [...prev, { id: Date.now(), active: true, ...values } as User])
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				The grid is built via <code>createTypedDataGrid&lt;User&gt;()</code>: <code>setValue</code>,{' '}
				<code>setValues</code>, and <code>getState().values</code> are typed against <code>User</code>.
			</p>
			<DataGrid<User> table={table as never} />
		</div>
	)
}
