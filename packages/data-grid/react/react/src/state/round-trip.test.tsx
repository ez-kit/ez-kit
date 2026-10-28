import { ACTIONS_COLUMN_ID, createColumns, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { extractState, parseState, useDataGrid } from '../index'
import { TEST_FEATURES } from '../test-utils'

type Row = { id: number; name: string }
const columns = createColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [{ id: 1, name: 'Alice' }]

describe('state persistence round-trip', () => {
	it('extractState output survives JSON + parseState and re-seeds a grid via initialState', () => {
		const { result: source } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data,
				columns,
				sorting: true,
				initialState: {
					sorting: [{ id: 'name', desc: true }],
					pagination: { pageIndex: 3, pageSize: 50 },
				},
			}),
		)
		const wire = JSON.parse(JSON.stringify(extractState(source.current))) as unknown
		const restored = parseState(wire)

		const { result: seeded } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data, columns, sorting: true, initialState: restored }),
		)
		expect(seeded.current.store.state.sorting).toEqual([{ id: 'name', desc: true }])
		expect(seeded.current.store.state.pagination).toEqual({ pageIndex: 3, pageSize: 50 })
	})
})

describe('state persistence round-trip — the columns the config places', () => {
	type Person = { id: number; name: string; email: string; age: number }

	const PEOPLE: Person[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

	const PERSON_COLUMNS = createColumns<Person>([
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email' },
		{ accessorKey: 'age', header: 'Age' },
	])

	function usePeopleGrid(initialState?: ReturnType<typeof parseState>) {
		return useDataGrid({
			features: TEST_FEATURES,
			data: PEOPLE,
			columns: PERSON_COLUMNS,
			selection: true,
			deleting: { onDelete: () => {} },
			ordering: true,
			pinning: { column: true },
			visibility: true,
			...(initialState === undefined ? {} : { initialState }),
		})
	}

	function view(table: ReturnType<typeof usePeopleGrid>) {
		const ids = (columns: { id: string }[]) => columns.map((column) => column.id)
		return {
			start: ids(table.getStartLeafColumns()),
			end: ids(table.getEndLeafColumns()),
			order: ids(table.getAllLeafColumns()),
			visible: ids(table.getVisibleLeafColumns()),
		}
	}

	it('restores the same pins, order and visibility from a value without them', () => {
		const { result: source } = renderHook(() => usePeopleGrid())
		act(() => {
			source.current.getColumn('name')?.pin('start')
			source.current.getColumn('age')?.pin('end')
			source.current.setColumnOrder(['email', 'name', 'age'])
			source.current.getColumn('email')?.toggleVisibility(false)
		})

		const saved = extractState(source.current)
		expect(JSON.stringify(saved)).not.toContain('__')

		const restored = parseState(JSON.parse(JSON.stringify(saved)) as unknown)
		const { result: seeded } = renderHook(() => usePeopleGrid(restored))

		expect(view(seeded.current)).toEqual(view(source.current))
		expect(view(seeded.current).start[0]).toBe(SELECTION_COLUMN_ID)
		expect(view(seeded.current).end.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('restores a value saved before, with the forced columns in it, to the same view', () => {
		const { result: fresh } = renderHook(() =>
			usePeopleGrid(parseState({ columnPinning: { start: ['name'], end: [] } })),
		)
		const { result: legacy } = renderHook(() =>
			usePeopleGrid(parseState({ columnPinning: { start: [SELECTION_COLUMN_ID, 'name'], end: [ACTIONS_COLUMN_ID] } })),
		)

		expect(view(legacy.current)).toEqual(view(fresh.current))
	})

	it('ignores a column id the grid does not have', () => {
		const { result } = renderHook(() =>
			usePeopleGrid(parseState({ columnPinning: { start: ['__drag__', 'name'], end: [] } })),
		)

		expect(view(result.current).start).toEqual([SELECTION_COLUMN_ID, 'name'])
		expect(view(result.current).order).not.toContain('__drag__')
	})
})
