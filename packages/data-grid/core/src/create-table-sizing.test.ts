import { describe, expect, it } from 'vitest'

import { createTable, defineColumns } from './index'

type Row = {
	id: number
	name: string
}

const COLUMNS = defineColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const DATA: Row[] = [{ id: 1, name: 'Alice' }]

describe('createTable — sizing', () => {
	it('sizing: true enables enableColumnResizing', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: true })
		expect(table.options.enableColumnResizing).toBe(true)
	})

	it('sizing: true uses onChange as default mode', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: true })
		expect(table.options.columnResizeMode).toBe('onChange')
	})

	it('sizing: true uses ltr as default direction', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: true })
		expect(table.options.columnResizeDirection).toBe('ltr')
	})

	it('sizing: { mode: "onEnd" } sets columnResizeMode to onEnd', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: { mode: 'onEnd' } })
		expect(table.options.columnResizeMode).toBe('onEnd')
	})

	it('sizing: { direction: "rtl" } sets columnResizeDirection to rtl', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: { direction: 'rtl' } })
		expect(table.options.columnResizeDirection).toBe('rtl')
	})

	it('sizing not set — enableColumnResizing is falsy', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnResizing).toBeFalsy()
	})

	it('column with enableResizing: false returns false from getCanResize()', () => {
		const cols = defineColumns<Row>([{ accessorKey: 'name', enableResizing: false }])
		const table = createTable({ data: DATA, columns: cols, sizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(false)
	})

	it('column without enableResizing restriction returns true from getCanResize() when sizing enabled', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(true)
	})
})
