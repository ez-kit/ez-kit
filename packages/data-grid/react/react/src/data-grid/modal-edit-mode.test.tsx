import { createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string }

const USERS: User[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

const renderModalMode = () =>
	render(
		<DataGrid
			data={USERS}
			columns={COLUMNS}
			components={testComponents}
			editing={{ mode: 'modal', onSave: async () => {} }}
		/>,
	)

/**
 * `editing.mode: 'modal'` used to open the row as well as the dialog.
 *
 * Every mode but `cell` sets the same `editing.rowId`, and the body cell tested only for that —
 * so raising the dialog also swapped the row's cells for inputs, leaving two live editors bound
 * to one set of values. It went unseen because a Radix dialog `aria-hidden`s everything behind
 * it, which hides the second form from an accessibility-tree query while leaving it in the DOM;
 * under HeroUI, whose overlay does not, both were reachable.
 */
describe("editing.mode: 'modal'", () => {
	it('opens exactly one editor for the row it was raised on', () => {
		renderModalMode()

		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

		expect(screen.getAllByDisplayValue('Alice')).toHaveLength(1)
	})

	it('leaves the body cell as text', () => {
		renderModalMode()

		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

		const cell = screen.getByRole('cell', { name: 'Alice' })
		expect(cell.querySelector('input')).toBeNull()
	})
})
