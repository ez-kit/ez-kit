import { createColumns } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

import type { TestRow } from '../test-utils'

/**
 * The names a screen reader reads that a sighted user reads from context.
 *
 * Three `<th>`s carry no text of their own (the checkbox, chevron and action columns) and the
 * filter controls carry only a placeholder, which disappears on the first keystroke and is not
 * an accessible name. Both were axe violations in **both** kits — `empty-table-header` and
 * `label` — so they are fixed in this package rather than twice over in the kits, and asserted
 * here through the roles rather than through the `data-slot` that happens to carry them.
 */

/** Enough of an editing config for the grid to inject the `__actions__` column. */
const EDIT_DELETE = {
	editing: { mode: 'row', onSave: () => Promise.resolve() },
	deleting: { onDelete: () => {} },
} as const

const FILTERABLE_COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name', filtering: {} },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
])

describe('accessible names', () => {
	it('names every column filter control, whichever branch renders it', () => {
		renderGrid({ filtering: true, columns: FILTERABLE_COLUMNS })

		// `name` takes the plain fallback input (named by `aria-label`), `age` the cell type's own
		// number control behind an operator select (named by the visually-hidden `<label>`).
		expect(screen.getByLabelText('Filter name…')).toBeTruthy()
		expect(screen.getByLabelText('Filter age…')).toBeTruthy()
	})

	it('names the row-actions column header', () => {
		renderGrid({ ...EDIT_DELETE })

		expect(screen.getByRole('columnheader', { name: 'Row actions' })).toBeTruthy()
	})

	it('names the expand column header', () => {
		renderGrid({ expanding: { component: () => 'detail' } })

		expect(screen.getByRole('columnheader', { name: 'Row expansion' })).toBeTruthy()
	})

	it('names the selection column header when there is no select-all checkbox to name it', () => {
		renderGrid({ selection: { multi: false } })

		expect(screen.getByRole('columnheader', { name: 'Row selection' })).toBeTruthy()
	})

	it('leaves the select-all checkbox as the selection header name when there is one', () => {
		renderGrid({ selection: true })

		expect(screen.getByRole('columnheader', { name: 'Select all rows' })).toBeTruthy()
		expect(screen.queryByRole('columnheader', { name: 'Row selection' })).toBeNull()
	})

	it('a column header the consumer wrote replaces the fallback rather than joining it', () => {
		renderGrid({ ...EDIT_DELETE, rowActions: { column: { header: 'Ops' } } })

		expect(screen.getByRole('columnheader', { name: 'Ops' })).toBeTruthy()
		expect(screen.queryByRole('columnheader', { name: 'Row actions' })).toBeNull()
	})

	it('names them from the dictionary, not from a literal', () => {
		renderGrid({
			...EDIT_DELETE,
			messages: { rowActions: { columnHeader: 'Действия' } },
		})

		expect(screen.getByRole('columnheader', { name: 'Действия' })).toBeTruthy()
	})
})
