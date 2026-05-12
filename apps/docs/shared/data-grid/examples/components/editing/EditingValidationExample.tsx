'use client'

import { ValidationError } from '@ez-kit/data-grid-react'
import { useState } from 'react'
import { z } from 'zod'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

const userSchema = z.object({
	name: z.string().min(2, 'must be at least 2 chars'),
	email: z.email('must be a valid email'),
	age: z.number().int().min(18, 'must be 18 or older').max(120, 'must be ≤120'),
})

const TAKEN_EMAILS = new Set(['taken@example.com'])

export function EditingValidationExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid<User>({
		data,
		columns,
		editing: {
			mode: 'row',
			validate: { schema: userSchema },
			onSave: async (rowId, values) => {
				await new Promise<void>((r) => {
					setTimeout(r, 350)
				})
				if (typeof values.email === 'string' && TAKEN_EMAILS.has(values.email)) {
					throw new ValidationError({
						errors: { email: ['already in use'] },
					})
				}
				setData((prev) => prev.map((row) => (String(row.id) === rowId ? { ...row, ...values } : row)))
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Click <strong>Edit</strong> on any row, then <strong>Save</strong>. Try setting the email to{' '}
				<code>taken@example.com</code> to see the server simulator throw <code>ValidationError</code>.
			</p>
			<DataGrid<User> table={table} />
		</div>
	)
}
