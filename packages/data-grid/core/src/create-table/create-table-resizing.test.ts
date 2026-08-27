import { describe, expect, it } from 'vitest'

import { createTable, createColumns } from '../index'

type Row = {
	id: number
	name: string
}

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const DATA: Row[] = [{ id: 1, name: 'Alice' }]

describe('createTable — resizing', () => {
	it('resizing: true enables enableColumnResizing', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.enableColumnResizing).toBe(true)
	})

	it('resizing: true uses onChange as default mode', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.columnResizeMode).toBe('onChange')
	})

	it('resizing: true uses ltr as default direction', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.columnResizeDirection).toBe('ltr')
	})

	it('resizing: { mode: "onEnd" } sets columnResizeMode to onEnd', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: { mode: 'onEnd' } })
		expect(table.options.columnResizeMode).toBe('onEnd')
	})

	it('resizing: { direction: "rtl" } sets columnResizeDirection to rtl', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: { direction: 'rtl' } })
		expect(table.options.columnResizeDirection).toBe('rtl')
	})

	it('resizing not set — enableColumnResizing is falsy', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnResizing).toBeFalsy()
	})

	it('column with resizing: false returns false from getCanResize()', () => {
		const cols = createColumns<Row>([{ accessorKey: 'name', resizing: false }])
		const table = createTable({ data: DATA, columns: cols, resizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(false)
	})

	it('column without resizing restriction returns true from getCanResize() when resizing enabled', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(true)
	})

	it('resizing: false sets enableColumnResizing to false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: false })
		expect(table.options.enableColumnResizing).toBe(false)
	})

	it('resizing: false makes getCanResize() false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: false })
		expect(table.getColumn('name')?.getCanResize()).toBe(false)
	})

	it('resizing not set makes getCanResize() false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getColumn('name')?.getCanResize()).toBe(false)
	})
})
