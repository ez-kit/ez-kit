import { describe, expect, it } from 'vitest'

import { getGridTemplateColumns } from './column-size-vars'
import { getVisualLeafColumns } from './visual-column-order'

import type { DataTable } from '@ez-kit/data-grid-core'

type MockColumn = { id: string; size: number; isSystem?: boolean }

type MockPinning = { left?: string[]; right?: string[] }

/**
 * A table modelled on how TanStack actually resolves these two orders.
 *
 * `getVisibleLeafColumns()` is `getAllLeafColumns().filter(visible)` — the
 * **declaration** order, pinning ignored. The pin groups are the ids in the
 * `columnPinning` arrays, **in those arrays' own order**, which is the order the
 * cells and headers render in. Pin a column that is not at the declaration
 * order's matching end and the two disagree.
 */
function mockTable(columns: MockColumn[], pinning: MockPinning = {}): DataTable<object> {
	const left = pinning.left ?? []
	const right = pinning.right ?? []
	const toColumn = (col: MockColumn) => ({
		id: col.id,
		getSize: () => col.size,
		getIsPinned: () => (left.includes(col.id) ? 'left' : right.includes(col.id) ? 'right' : false),
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
		getLeftVisibleLeafColumns: () => group(left),
		getRightVisibleLeafColumns: () => group(right),
		getCenterVisibleLeafColumns: () =>
			columns.filter((col) => !left.includes(col.id) && !right.includes(col.id)).map(toColumn),
	} as unknown as DataTable<object>
}

/**
 * The state a user reaches by pinning `paid` to the right of a grid that already
 * pins its actions column there: `paid` is declared *before* the actions column but
 * lands *after* it on screen.
 */
const COLUMNS: MockColumn[] = [
	{ id: '__selection__', size: 44, isSystem: true },
	{ id: 'reference', size: 170 },
	{ id: 'paid', size: 130 },
	{ id: '__actions__', size: 136, isSystem: true },
]
const PINNING: MockPinning = { left: ['__selection__', 'reference'], right: ['__actions__', 'paid'] }

function trackIds(template: string): string[] {
	return [...template.matchAll(/--col-(.+?)-size/g)].map((match) => match[1] ?? '')
}

describe('getVisualLeafColumns', () => {
	it('orders columns left, centre, right rather than by declaration', () => {
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
	// gap between two right-pinned columns this fixes: 136 − 130 = 6px.
	it('lays the tracks out in the order the cells are rendered in', () => {
		const table = mockTable(COLUMNS, PINNING)
		expect(trackIds(getGridTemplateColumns(table))).toEqual(getVisualLeafColumns(table).map((col) => col.id))
	})

	it('keeps pinned and system tracks fixed and lets centre tracks flex', () => {
		const table = mockTable(COLUMNS, { right: ['__actions__'] })
		expect(getGridTemplateColumns(table)).toBe(
			'calc(var(--col-__selection__-size) * 1px) ' +
				'minmax(calc(var(--col-reference-size) * 1px), 1fr) ' +
				'minmax(calc(var(--col-paid-size) * 1px), 1fr) ' +
				'calc(var(--col-__actions__-size) * 1px)',
		)
	})
})
