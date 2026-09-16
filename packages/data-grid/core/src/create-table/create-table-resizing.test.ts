import { columnResizingFeature, columnSizingFeature, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createTable, createColumns } from '../index'

import { createTableOptions } from './create-table-options'

type Row = {
	id: number
	name: string
}

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const DATA: Row[] = [{ id: 1, name: 'Alice' }]

/**
 * Resizing is two features: `columnResizingFeature` drives the drag, and `columnSizingFeature`
 * owns the `columnSizing` slice it writes and the `getCanResize()` / `getSize()` APIs. Upstream
 * turns the missing prerequisite into a type error at the key, so the pair is always registered
 * together.
 */
const RESIZING = tableFeatures({ columnResizingFeature, columnSizingFeature })

describe('createTable — resizing', () => {
	it('resizing: true enables enableColumnResizing', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.enableColumnResizing).toBe(true)
	})

	it('resizing: true uses onChange as default mode', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.columnResizeMode).toBe('onChange')
	})

	it('resizing: true uses ltr as the default grid direction', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: true })
		expect(table.options.columnResizeDirection).toBe('ltr')
	})

	it('resizing: { mode: "onEnd" } sets columnResizeMode to onEnd', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: { mode: 'onEnd' } })
		expect(table.options.columnResizeMode).toBe('onEnd')
	})

	it('root direction: "rtl" sets columnResizeDirection to rtl', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: true, direction: 'rtl' })
		expect(table.options.columnResizeDirection).toBe('rtl')
	})

	it('root direction travels on `grid`, not on the resizing option, when resizing is off', () => {
		// This case used to assert `table.options.columnResizeDirection === 'rtl'` with resizing
		// left at its defaults. That contract is gone: `columnResizeDirection` is declared on
		// `TableOptions_ColumnResizing` and does not exist on a table without
		// `columnResizingFeature`, so setting it there unconditionally would put a key where
		// nothing reads it. The grid's direction is a fact about the grid, not a resize setting,
		// so it now travels on `grid.direction`, which is always set — and any reader that wants
		// the direction reads that, never the resizing option.
		const { options, grid } = createTableOptions({
			features: tableFeatures({}),
			data: DATA,
			columns: COLUMNS,
			direction: 'rtl',
		})

		expect(grid.direction).toBe('rtl')
		expect(options).not.toHaveProperty('columnResizeDirection')
	})

	it('resizing not set — enableColumnResizing is falsy', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnResizing).toBeFalsy()
	})

	it('column with resizing: false returns false from getCanResize()', () => {
		const cols = createColumns<Row>([{ accessorKey: 'name', resizing: false }])
		const table = createTable({ features: RESIZING, data: DATA, columns: cols, resizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(false)
	})

	it('column without resizing restriction returns true from getCanResize() when resizing enabled', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: true })
		const col = table.getColumn('name')
		expect(col?.getCanResize()).toBe(true)
	})

	it('resizing: false sets enableColumnResizing to false', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: false })
		expect(table.options.enableColumnResizing).toBe(false)
	})

	it('resizing: false makes getCanResize() false', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: false })
		expect(table.getColumn('name')?.getCanResize()).toBe(false)
	})

	it('resizing not set makes getCanResize() false', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS })
		expect(table.getColumn('name')?.getCanResize()).toBe(false)
	})
})
