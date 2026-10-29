import { tableFeatures } from '@tanstack/table-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { cellFlashingFeature, flashRequestsOf } from './flashing'

type Row = { id: number; name: string }
type AnonymousRow = { name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const FLASHING = tableFeatures({ cellFlashingFeature })

const makeTable = (config: object = {}) => createTable({ features: FLASHING, data: DATA, columns: COLUMNS, ...config })

afterEach(() => {
	vi.restoreAllMocks()
})

describe('cellFlashingFeature — flashCells', () => {
	it('starts with no request', () => {
		const table = makeTable()
		expect(flashRequestsOf(table)?.get()).toBeNull()
	})

	it('publishes each call as a request with a growing seq and the address it was given', () => {
		const table = makeTable()

		table.flashCells({ rowIds: ['1'], columnIds: ['name'], flashDuration: 50, fadeDuration: 70 })
		const first = flashRequestsOf(table)?.get()
		table.flashCells()
		const second = flashRequestsOf(table)?.get()

		expect(first).toEqual({ seq: 1, rowIds: ['1'], columnIds: ['name'], flashDuration: 50, fadeDuration: 70 })
		expect(second).toEqual({ seq: 2 })
	})

	it('notifies subscribers of the request source', () => {
		const table = makeTable()
		const listener = vi.fn()
		flashRequestsOf(table)?.subscribe(listener)

		table.flashCells({ rowIds: ['2'] })

		expect(listener).toHaveBeenCalledWith({ seq: 1, rowIds: ['2'] })
	})

	it('touches no table state and calls no onStateChange', () => {
		const onStateChange = vi.fn()
		const table = makeTable({ onStateChange })
		const before = table.store.state

		table.flashCells()

		expect(table.store.state).toBe(before)
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('a table without the feature has no request source', () => {
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })
		expect(flashRequestsOf(table)).toBeUndefined()
	})
})

describe('cellFlashingFeature — development warnings', () => {
	it('warns when the grid asks for flashing without the feature', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS, flashing: true })

		const calls = warn.mock.calls.filter(([message]) => String(message).includes('cellFlashingFeature'))
		expect(calls).toHaveLength(1)
		expect(String(calls[0]?.[0])).toContain('`flashing`')
	})

	it('warns when only a column asks for flashing without the feature', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const columns = createColumns<Row>([{ accessorKey: 'name', id: 'column-asks', flashing: true }])

		createTable({ features: tableFeatures({}), data: DATA, columns })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining("a column's `flashing`"))
	})

	it('warns once when flashing rides on index-based row ids', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const columns = createColumns<AnonymousRow>([{ accessorKey: 'name' }])
		const config = { features: FLASHING, data: [{ name: 'Alice' }], columns, flashing: { fadeDuration: 999 } }

		createTable(config)
		createTable(config)

		const calls = warn.mock.calls.filter(([message]) => String(message).includes('getRowId'))
		expect(calls).toHaveLength(1)
	})

	it('stays silent about row ids when rows carry an id or the grid has getRowId', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const columns = createColumns<AnonymousRow>([{ accessorKey: 'name' }])

		makeTable({ flashing: true })
		createTable({
			features: FLASHING,
			data: [{ name: 'Alice' }],
			columns,
			flashing: true,
			getRowId: (row: AnonymousRow) => row.name,
		})

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('getRowId'))
	})
})
