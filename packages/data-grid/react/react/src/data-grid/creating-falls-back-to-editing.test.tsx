import { createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { FieldState } from '@ez-kit/data-grid-core'

type Row = { id: number; name: string }
const ROWS: Row[] = [{ id: 1, name: 'Alice' }]

function EditingInput(props: FieldState<unknown, string>) {
	return (
		<input
			data-testid='editing-input'
			value={props.value}
			onChange={(e) => {
				props.onChange(e.target.value)
			}}
		/>
	)
}

function CreatingInput(props: FieldState<unknown, string>) {
	return (
		<input
			data-testid='creating-input'
			value={props.value}
			onChange={(e) => {
				props.onChange(e.target.value)
			}}
		/>
	)
}

function openCreateForm(columns: ReturnType<typeof createColumns<Row>>) {
	render(
		<DataGrid
			data={ROWS}
			columns={columns}
			components={testComponents}
			creating={{ mode: 'row', onSave: () => undefined }}
		>
			<DataGrid.Toolbar />
			<DataGrid.Table />
		</DataGrid>,
	)
	fireEvent.click(screen.getByText('+ Add'))
}

/**
 * `column.creating.component` is documented as falling back to `column.editing.component` in
 * the option's own JSDoc, in `creating.validateOn`'s, and on the validation docs page. It did
 * not: the create form read `meta.creating` alone, so a column that declared only
 * `editing.component` rendered its own input while editing and the generic fallback input
 * while creating.
 */
describe('column.creating.component falls back to column.editing.component', () => {
	it('uses the editing component in the create row when the column declares no creating one', () => {
		openCreateForm(createColumns<Row>([{ accessorKey: 'name', editing: { component: EditingInput } }]))

		expect(screen.getByTestId('editing-input')).toBeInTheDocument()
	})

	it('prefers the creating component when the column declares both', () => {
		openCreateForm(
			createColumns<Row>([
				{ accessorKey: 'name', editing: { component: EditingInput }, creating: { component: CreatingInput } },
			]),
		)

		expect(screen.getByTestId('creating-input')).toBeInTheDocument()
		expect(screen.queryByTestId('editing-input')).toBeNull()
	})

	it('honours `creating: false` over the fallback', () => {
		openCreateForm(createColumns<Row>([{ accessorKey: 'name', editing: { component: EditingInput }, creating: false }]))

		expect(screen.queryByTestId('editing-input')).toBeNull()
	})
})
