import { canMoveColumn, ColumnMoveDirection, ColumnMoveScope } from '@ez-kit/data-grid-core'
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../react-columns'
import { renderGrid } from '../test-utils'

import { getColumnMoveCapabilities, getColumnVisualIndex } from './column-order-model'
import { getVisualLeafColumns } from './visual-column-order'

const data = [{ a: 1, b: 2, c: 3, d: 4 }]
const columns = createColumns<(typeof data)[number]>([
	{ accessorKey: 'a' },
	{ accessorKey: 'b', ordering: false },
	{ accessorKey: 'c' },
	{ accessorKey: 'd' },
])

describe('cached column order answers', () => {
	it('follows Core across visibility, order, pinning and grouping changes in both scopes', () => {
		const { table } = renderGrid(
			{ data, columns, visibility: true, grouping: true, ordering: { column: true }, pinning: { column: true } },
			<></>,
		)
		const verify = () => {
			const visual = getVisualLeafColumns(table)
			for (const id of ['a', 'b', 'c', 'd']) {
				expect(getColumnVisualIndex(table, id)).toBe(visual.findIndex((column) => column.id === id))
				for (const scope of [ColumnMoveScope.Visible, ColumnMoveScope.All]) {
					expect(getColumnMoveCapabilities(table, id, scope)).toEqual({
						start: canMoveColumn(table, id, ColumnMoveDirection.Start, scope),
						end: canMoveColumn(table, id, ColumnMoveDirection.End, scope),
					})
				}
			}
		}
		verify()
		act(() => {
			table.setColumnVisibility({ b: false })
		})
		verify()
		// A hidden locked column is transparent in the header, but blocks its panel neighbour.
		expect(getColumnMoveCapabilities(table, 'a', ColumnMoveScope.Visible).end).toBe(true)
		expect(getColumnMoveCapabilities(table, 'a', ColumnMoveScope.All).end).toBe(false)
		act(() => {
			table.setColumnOrder(['d', 'c', 'b', 'a'])
		})
		verify()
		act(() => {
			table.setColumnPinning({ start: ['c'], end: ['a'] })
		})
		verify()
		act(() => {
			table.setColumnPinning({ start: [], end: [] })
		})
		verify()
		act(() => {
			table.setGrouping(['c'])
		})
		verify()
		expect(getColumnVisualIndex(table, 'c')).toBe(-1)
		act(() => {
			table.setGrouping([])
			table.setColumnVisibility({})
		})
		verify()
	})

	it('shares visual indices and keeps computed moves across unrelated state writes', () => {
		const { table } = renderGrid({ data, columns, ordering: { column: true }, editing: { onSave: () => {} } }, <></>)
		const readVisual = vi.spyOn(table, 'getCenterVisibleLeafColumns')
		const first = getColumnMoveCapabilities(table, 'c')
		expect(getColumnVisualIndex(table, 'a')).toBe(0)
		expect(getColumnVisualIndex(table, 'b')).toBe(1)
		expect(readVisual).toHaveBeenCalledOnce()
		act(() => {
			table.editing.start('0')
			table.editing.setValue('a', 42)
		})
		expect(getColumnMoveCapabilities(table, 'c')).toBe(first)
		expect(getColumnVisualIndex(table, 'c')).toBe(2)
		expect(readVisual).toHaveBeenCalledOnce()
		readVisual.mockRestore()
	})
})
