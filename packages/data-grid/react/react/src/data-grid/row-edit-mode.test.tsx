import { createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; createdAt: string }

const USERS: User[] = [{ id: 1, name: 'Alice', createdAt: '2026-01-01' }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'createdAt', header: 'Created', editing: false },
])

const renderRowMode = (onSave: (args: { values: Partial<User> }) => void = () => {}) =>
	render(
		<DataGrid
			features={TEST_FEATURES}
			data={USERS}
			columns={COLUMNS}
			components={testComponents}
			editing={{
				mode: 'row',
				onSave: (args) => {
					onSave(args)
				},
			}}
		/>,
	)

/**
 * The edit form holds only its own fields, so a column with `editing: false` has no value in it.
 * Its cell in the open row must keep reading the row, not the form — this pins that before the
 * form stopped seeding such columns, so the change could not blank them.
 */
describe("editing.mode: 'row' — column editing: false", () => {
	it('shows the row value in the opted-out cell while the row is open', () => {
		renderRowMode()

		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
		const created = screen.getByRole('cell', { name: '2026-01-01' })
		expect(created.querySelector('input')).toBeNull()
	})

	it('saves without the opted-out column', async () => {
		const onSave = vi.fn()
		renderRowMode(onSave)

		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
		fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
		fireEvent.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'Alicia' } }))
		})
	})
})
