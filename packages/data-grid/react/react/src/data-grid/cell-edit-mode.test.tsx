import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; auditedBy: string }

const USERS: User[] = [{ id: 1, name: 'Alice', auditedBy: 'system' }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'auditedBy', header: 'Audited by', editing: false },
])

const renderCellMode = () =>
	render(
		<DataGrid
			data={USERS}
			columns={COLUMNS}
			components={testComponents}
			editing={{ mode: 'cell', onSave: async () => {} }}
		/>,
	)

/**
 * `editing: false` used to be honoured in row and modal mode but bypassed in cell mode — the
 * render guard short-circuited on the mode, and the double-click handler was attached
 * unconditionally. A read-only column therefore became an input on double-click, and the value
 * reached `onSave`.
 */
describe('editing.mode: cell — column editing: false', () => {
	it('opens no input on a column that opted out', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('system'))

		expect(screen.queryByDisplayValue('system')).toBeNull()
	})

	it('still opens an input on a column that did not', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('Alice'))

		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
	})

	it('ignores a programmatic startCell on a column that opted out', () => {
		const table = createTable<User>({
			data: USERS,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: async () => {} },
		})

		table.editing.startCell('0', 'auditedBy')

		expect(table.editing.getState().cellId).toBeNull()
	})
})
