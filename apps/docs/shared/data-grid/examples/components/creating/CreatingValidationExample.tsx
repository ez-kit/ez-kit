'use client'

import { ValidationError } from '@ez-kit/data-grid-react'
import { useState } from 'react'
import { z } from 'zod'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

const userSchema = z.object({
	name: z.string().min(2, 'must be at least 2 chars'),
	email: z.email('must be a valid email'),
	age: z
		.number({ message: 'age is required' })
		.int('must be a whole number')
		.min(18, 'must be 18 or older')
		.max(120, 'must be ≤120'),
})

export function CreatingValidationExample() {
	const [data, setData] = useState(INITIAL_DATA)
	const [serverShouldFail, setServerShouldFail] = useState(false)

	const table = useDataGrid<User>({
		data,
		columns,
		creating: {
			mode: 'modal',
			validate: { schema: userSchema },
			onSave: async ({ values }) => {
				// Simulate latency so the spinner is visible.
				await new Promise<void>((r) => {
					setTimeout(r, 400)
				})
				if (serverShouldFail) {
					throw new ValidationError({
						errors: { email: ['email already in use'] },
						formError: 'Could not save — try a different email',
					})
				}
				setData((prev) => [...prev, { id: Date.now(), active: true, ...values } as User])
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
				Open the create form via <strong>Add row</strong>. Validation runs on submit using a zod schema; the server
				simulator can be toggled to throw <code>ValidationError</code>.
			</p>
			<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
				<input
					type='checkbox'
					checked={serverShouldFail}
					onChange={(e) => {
						setServerShouldFail(e.target.checked)
					}}
				/>
				Simulate server-side rejection
			</label>
			<DataGrid<User> table={table} />
		</div>
	)
}
