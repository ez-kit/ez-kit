import { describe, expect, it } from 'vitest'

import { getGridTemplateColumns } from './column-size-vars'
import { getVisualLeafColumns } from './visual-column-order'

import type { DataTable, GridFeatures } from '../types'

type MockColumn = { id: string; size: number; isSystem?: boolean }

type MockPinning = { start?: string[]; end?: string[] }

/**
 * A table modelled on how TanStack actually resolves these two orders.
 *
 * `getVisibleLeafColumns()` is `getAllLeafColumns().filter(visible)` — the
 * **declaration** order, pinning ignored. The pin groups are the ids in the
 * `columnPinning` arrays, **in those arrays' own order**, which is the order the
 * cells and headers render in. Pin a column that is not at the declaration
 * order's matching end and the two disagree.
 */
function mockTable(columns: MockColumn[], pinning: MockPinning = {}): DataTable<GridFeatures, object> {
	const start = pinning.start ?? []
	const end = pinning.end ?? []
	const toColumn = (col: MockColumn) => ({
		id: col.id,
		getSize: () => col.size,
		getIsPinned: () => (start.includes(col.id) ? 'start' : end.includes(col.id) ? 'end' : false),
		columnDef: { meta: col.isSystem === true ? { isSystemColumn: true } : {} },
	})
	const group = (ids: string[]) =>
		ids.flatMap((id) => {
			const col = columns.find((candidate) => candidate.id === id)
			return col ? [toColumn(col)] : []
		})
	return {
		options: {},
		getVisibleLeafColumns: () => columns.map(toColumn),
		getStartVisibleLeafColumns: () => group(start),
		getEndVisibleLeafColumns: () => group(end),
		getCenterVisibleLeafColumns: () =>
			columns.filter((col) => !start.includes(col.id) && !end.includes(col.id)).map(toColumn),
	} as unknown as DataTable<GridFeatures, object>
}

/**
 * The state a user reaches by pinning `paid` to the end of a grid that already
 * pins its actions column there: `paid` is declared *before* the actions column but
 * lands *after* it on screen.
 */
const COLUMNS: MockColumn[] = [
	{ id: '__selection__', size: 44, isSystem: true },
	{ id: 'reference', size: 170 },
	{ id: 'paid', size: 130 },
	{ id: '__actions__', size: 136, isSystem: true },
]
const PINNING: MockPinning = { start: ['__selection__', 'reference'], end: ['__actions__', 'paid'] }

function trackIds(template: string): string[] {
	return [...template.matchAll(/--col-(.+?)-size/g)].map((match) => match[1] ?? '')
}

describe('getVisualLeafColumns', () => {
	it('orders columns start, centre, end rather than by declaration', () => {
		const table = mockTable(COLUMNS, PINNING)
		expect(getVisualLeafColumns(table).map((col) => col.id)).toEqual([
			'__selection__',
			'reference',
			'__actions__',
			'paid',
		])
		// What TanStack's own `getVisibleLeafColumns()` reports for the same table —
		// `paid` before the actions column. Using it for layout is the defect.
		expect(table.getVisibleLeafColumns().map((col) => col.id)).toEqual([
			'__selection__',
			'reference',
			'paid',
			'__actions__',
		])
	})
})

describe('getGridTemplateColumns', () => {
	// A cell in the wrong track takes its neighbour's width, and the sticky offsets —
	// computed per pin group, so in visual order — then disagree with the widths on
	// screen by the difference between the two declared sizes. That difference is the
	// gap between two end-pinned columns this fixes: 136 − 130 = 6px.
	it('lays the tracks out in the order the cells are rendered in', () => {
		const table = mockTable(COLUMNS, PINNING)
		expect(trackIds(getGridTemplateColumns(table))).toEqual(getVisualLeafColumns(table).map((col) => col.id))
	})

	it('keeps pinned and system tracks fixed and lets centre tracks flex', () => {
		const table = mockTable(COLUMNS, { end: ['__actions__'] })
		expect(getGridTemplateColumns(table)).toBe(
			'calc(var(--col-__selection__-size) * 1px) ' +
				'minmax(calc(var(--col-reference-size) * 1px), 1fr) ' +
				'minmax(calc(var(--col-paid-size) * 1px), 1fr) ' +
				'calc(var(--col-__actions__-size) * 1px)',
		)
	})
})
