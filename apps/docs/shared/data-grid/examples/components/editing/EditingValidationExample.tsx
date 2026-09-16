'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	editingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { ValidationError } from '@ez-kit/data-grid-react'
import { useState } from 'react'
import { z } from 'zod'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	editingFeature,
})

const userSchema = z.object({
	name: z.string().min(2, 'must be at least 2 chars'),
	email: z.email('must be a valid email'),
	age: z.number().int().min(18, 'must be 18 or older').max(120, 'must be ≤120'),
})

const TAKEN_EMAILS = new Set(['taken@example.com'])

export function EditingValidationExample() {
	const [data, setData] = useState(INITIAL_DATA)

	return (
		<DataGrid<typeof features, User>
			features={features}
			data={data}
			columns={columns}
			editing={{
				mode: 'row',
				validate: { schema: userSchema },
				onSave: async ({ rowId, values }) => {
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
			}}
		/>
	)
}
