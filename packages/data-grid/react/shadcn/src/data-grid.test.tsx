import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { render, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createColumns, DataGrid, useDataGrid } from './data-grid'

type Person = { id: number; name: string }

describe('the prebuilt grid', () => {
	it('offers the ready-made operators of a column’s type without naming a set', () => {
		const columns = createColumns<Person>([{ accessorKey: 'name', filtering: { operators: true } }])

		const { result } = renderHook(() => useDataGrid({ data: [{ id: 1, name: 'Ann' }], columns, filtering: true }))

		const filtering = result.current.getColumn('name')?.columnDef.meta?.filtering
		expect(filtering === false ? undefined : filtering?.operators).toBe(defaultOperators.byType.text)
	})
})

it('passes resolved editability through the kit header to the DOM', async () => {
	const { container } = render(
		<DataGrid
			data={[{ id: 1, name: 'Ada' }]}
			columns={createColumns<Person>([{ accessorKey: 'id', editing: false }, { accessorKey: 'name' }])}
			editing={{ onSave: async () => {} }}
			selection
		/>,
	)
	await waitFor(() => {
		const editable = container.querySelectorAll('th[data-editable="true"]')
		expect(editable).toHaveLength(1)
		expect(editable[0]?.getAttribute('data-column-id')).toBe('name')
	})
	expect(container.querySelector('th[data-column-id="id"]')?.hasAttribute('data-editable')).toBe(false)
})
