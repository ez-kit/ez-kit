import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { extractState, parseState, useDataGrid } from '../index'

type Row = { id: number; name: string }
const columns = createColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [{ id: 1, name: 'Alice' }]

describe('state persistence round-trip', () => {
	it('extractState output survives JSON + parseState and re-seeds a grid via initialState', () => {
		const { result: source } = renderHook(() =>
			useDataGrid({
				data,
				columns,
				sorting: true,
				initialState: {
					sorting: [{ id: 'name', desc: true }],
					pagination: { pageIndex: 3, pageSize: 50 },
				},
			}),
		)
		const wire = JSON.parse(JSON.stringify(extractState(source.current.table))) as unknown
		const restored = parseState(wire)

		const { result: seeded } = renderHook(() => useDataGrid({ data, columns, sorting: true, initialState: restored }))
		expect(seeded.current.table.getState().sorting).toEqual([{ id: 'name', desc: true }])
		expect(seeded.current.table.getState().pagination).toEqual({ pageIndex: 3, pageSize: 50 })
	})
})
