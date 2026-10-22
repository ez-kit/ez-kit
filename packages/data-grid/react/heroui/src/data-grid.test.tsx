import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createColumns, useDataGrid } from './data-grid'

type Person = { id: number; name: string }

describe('the prebuilt grid', () => {
	it('offers the ready-made operators of a column’s type without naming a set', () => {
		const columns = createColumns<Person>([{ accessorKey: 'name', filtering: { operators: true } }])

		const { result } = renderHook(() => useDataGrid({ data: [{ id: 1, name: 'Ann' }], columns, filtering: true }))

		const filtering = result.current.getColumn('name')?.columnDef.meta?.filtering
		expect(filtering === false ? undefined : filtering?.operators).toBe(defaultOperators.byType.text)
	})
})
