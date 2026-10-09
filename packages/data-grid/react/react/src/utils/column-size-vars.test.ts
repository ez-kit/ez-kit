import { describe, expect, it } from 'vitest'

import { getColumnSizeVars, getGridTemplateColumns } from './column-size-vars'

import type { DataTable, GridFeatures } from '../types'
import type { ColumnWidthDef } from '@ez-kit/data-grid-core'

/** A header over a column whose author named its width, so its track is fixed at `colSize`. */
function makeHeader(id: string, headerSize: number, colSize: number, width: ColumnWidthDef = { default: colSize }) {
	return {
		column: { id, getSize: () => colSize, getIsPinned: () => false, columnDef: { meta: { width } } },
		getSize: () => headerSize,
	}
}

function mockTable(headers: ReturnType<typeof makeHeader>[]): DataTable<GridFeatures, object> {
	return {
		store: { state: { columnSizing: {} } },
		getFlatHeaders: () => headers,
		getVisibleLeafColumns: () => headers.map((header) => header.column),
	} as unknown as DataTable<GridFeatures, object>
}

describe('getColumnSizeVars', () => {
	it('returns CSS variables for each column', () => {
		const table = mockTable([makeHeader('name', 200, 200), makeHeader('age', 80, 80)])
		const vars = getColumnSizeVars(table)
		expect(vars).toMatchObject({
			'--header-name-size': '200',
			'--col-name-size': '200',
			'--header-age-size': '80',
			'--col-age-size': '80',
		})
	})

	it('returns only the zero table floor for a table with no headers', () => {
		const table = mockTable([])
		const vars = getColumnSizeVars(table)
		expect(vars).toEqual({ '--dg-table-min-width': '0px' })
	})

	// The floor keeps the table box — and with it the containing block of every sticky
	// pinned cell — as wide as the columns, not as wide as the scrollport.
	it('sums the visible leaf column widths into --dg-table-min-width', () => {
		const table = mockTable([makeHeader('name', 200, 200), makeHeader('age', 80, 80)])
		const vars = getColumnSizeVars(table)
		expect(vars['--dg-table-min-width' as keyof typeof vars]).toBe('280px')
	})

	// A filling column can shrink to its `min`, so the floor counts that — not the 150px TanStack
	// gives a column that names no starting width.
	it('floors a filling column at its min in --dg-table-min-width', () => {
		const table = mockTable([makeHeader('name', 200, 200), makeHeader('email', 150, 150, { min: 120 })])
		const vars = getColumnSizeVars(table)
		expect(vars['--dg-table-min-width' as keyof typeof vars]).toBe('320px')
	})

	it('uses header.getSize() for --header-* and column.getSize() for --col-*', () => {
		const table = mockTable([makeHeader('email', 300, 250)])
		const vars = getColumnSizeVars(table)
		expect(vars['--header-email-size' as keyof typeof vars]).toBe('300')
		expect(vars['--col-email-size' as keyof typeof vars]).toBe('250')
	})
})

type TrackColumn = {
	id: string
	pinned?: 'start' | 'end'
	isSystem?: boolean
	width?: ColumnWidthDef
	maxSize?: number
	resizing?: false
}

function trackTable(
	columns: TrackColumn[],
	{ resizing = false, columnSizing = {} }: { resizing?: boolean; columnSizing?: Record<string, number> } = {},
): DataTable<GridFeatures, object> {
	const toColumn = (col: TrackColumn) => ({
		id: col.id,
		getIsPinned: () => col.pinned ?? false,
		columnDef: {
			meta: {
				...(col.isSystem === true ? { isSystemColumn: true } : {}),
				...(col.width === undefined ? {} : { width: col.width }),
			},
			...(col.maxSize === undefined ? {} : { maxSize: col.maxSize }),
			...(col.resizing === false ? { enableResizing: false } : {}),
		},
	})
	const pinnedTo = (side: 'start' | 'end') => columns.filter((col) => col.pinned === side).map(toColumn)
	return {
		options: { enableColumnResizing: resizing },
		store: { state: { columnSizing } },
		getStartVisibleLeafColumns: () => pinnedTo('start'),
		getCenterVisibleLeafColumns: () => columns.filter((col) => col.pinned === undefined).map(toColumn),
		getEndVisibleLeafColumns: () => pinnedTo('end'),
	} as unknown as DataTable<GridFeatures, object>
}

const fixed = (id: string) => `calc(var(--col-${id}-size) * 1px)`
const fluid = (id: string) => `minmax(${fixed(id)}, 1fr)`

describe('getGridTemplateColumns', () => {
	// Resizing used to fix every track, which left the free width of a resizable grid empty.
	it('lets a centre column fill the free width when resizing is on', () => {
		const table = trackTable([{ id: 'name' }, { id: 'email' }], { resizing: true })
		expect(getGridTemplateColumns(table)).toBe(`${fluid('name')} ${fluid('email')}`)
	})

	// A `fr` track cannot be capped, so a column with a `max` grows up to it and no further.
	it('caps a centre column that has a max width at that width', () => {
		const table = trackTable([{ id: 'name', maxSize: 400 }])
		expect(getGridTemplateColumns(table)).toBe(`minmax(${fixed('name')}, 400px)`)
	})

	// TanStack's default column def gives every column `maxSize: Number.MAX_SAFE_INTEGER`, so a
	// column without a `max` still carries one — and must still fill as a `1fr` track.
	it('treats the default max width as no max at all', () => {
		const table = trackTable([{ id: 'email', maxSize: Number.MAX_SAFE_INTEGER }])
		expect(getGridTemplateColumns(table)).toBe(fluid('email'))
	})

	// A named starting width is the width the column renders at; the columns that name none fill.
	it('fixes a column whose author named a starting width', () => {
		const table = trackTable([{ id: 'id', width: { default: 60 } }, { id: 'email' }])
		expect(getGridTemplateColumns(table)).toBe(`${fixed('id')} ${fluid('email')}`)
	})

	it('floors a filling column at its min', () => {
		const table = trackTable([{ id: 'name', width: { min: 120 } }])
		expect(getGridTemplateColumns(table)).toBe('minmax(120px, 1fr)')
	})

	// The user set this width by hand; free width goes to the columns still left to fill.
	it('fixes a column the user has resized', () => {
		const table = trackTable([{ id: 'name' }, { id: 'email' }], { resizing: true, columnSizing: { name: 320 } })
		expect(getGridTemplateColumns(table)).toBe(`${fixed('name')} ${fluid('email')}`)
	})

	it('fixes a column whose width is pinned with resizing: false', () => {
		const table = trackTable([{ id: 'active', resizing: false }, { id: 'email' }])
		expect(getGridTemplateColumns(table)).toBe(`${fixed('active')} ${fluid('email')}`)
	})

	it('fixes pinned and system columns', () => {
		const table = trackTable([
			{ id: '__selection__', pinned: 'start', isSystem: true },
			{ id: 'name' },
			{ id: 'total', pinned: 'end' },
		])
		expect(getGridTemplateColumns(table)).toBe(`${fixed('__selection__')} ${fluid('name')} ${fixed('total')}`)
	})
})
