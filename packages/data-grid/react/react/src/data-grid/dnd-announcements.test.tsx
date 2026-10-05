import { createColumns, defaultMessages, resolveMessages } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES } from '../test-utils'
import { useDataGrid } from '../use-data-grid'
import { getRowDropOrder } from '../utils/row-drop-order'

import { DragAxis, DragInput, DragSurface } from './dnd'
import { buildDndAnnouncements } from './dnd-announcements'

import type { DataTable, GridFeatures } from '../types'
import type { GridMessages } from '@ez-kit/data-grid-core'

type User = { id: number; name: string; price: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', price: 10 },
	{ id: 2, name: 'Bob', price: 20 },
	{ id: 3, name: 'Carol', price: 30 },
]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	// An element for a header, which is the case the id fallback exists for.
	{ accessorKey: 'price', header: () => <strong>Price</strong> },
])

function useTable() {
	return useDataGrid<GridFeatures, User>({
		features: TEST_FEATURES,
		data: USERS,
		columns: COLUMNS,
		getRowId: (row) => String(row.id),
	})
}

/**
 * The same grid with the row axis switched **on** — registering `rowOrderingFeature` is not the same
 * as enabling it, and `table.ordering.dropRow` drops a move on a disabled axis.
 *
 * Separate from {@link useTable} rather than folded into it because enabling an axis mounts that
 * axis' system column, which changes what the column lists contain and so what every column
 * position in this file would read.
 */
function useOrderedTable() {
	return useDataGrid<GridFeatures, User>({
		features: TEST_FEATURES,
		data: USERS,
		columns: COLUMNS,
		getRowId: (row) => String(row.id),
		ordering: { row: true },
	})
}

/** The announcements of a real table, with no virtualized window published. */
function announcementsOf(table: DataTable<GridFeatures, User>) {
	return buildDndAnnouncements(
		() => table,
		() => defaultMessages,
		() => null,
	)
}

const keyboardRow = { axis: DragAxis.Row, surface: DragSurface.Table, input: DragInput.Keyboard } as const
const keyboardColumn = { axis: DragAxis.Column, surface: DragSurface.Table, input: DragInput.Keyboard } as const

describe('buildDndAnnouncements', () => {
	it('names a row by its position among the rows the body renders', () => {
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragStart({ ...keyboardRow, sourceId: '2' })).toBe('Picked up row 2 of 3.')
	})

	it('names a column by its header text', () => {
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragStart({ ...keyboardColumn, sourceId: 'name' })).toBe(
			'Picked up column Name, position 1 of 2.',
		)
	})

	it('falls back to the column id when the header is an element', () => {
		// Never rendered to text: a header may be arbitrary JSX, and flattening one means rendering it
		// out of tree. The id is a worse name and an honest one.
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragStart({ ...keyboardColumn, sourceId: 'price' })).toBe(
			'Picked up column price, position 2 of 2.',
		)
	})

	it('says nothing about a pointer drag', () => {
		// The live region exists for a gesture its user cannot see, and a mouse crosses a new
		// neighbour several times a second.
		const { result } = renderHook(useTable)
		const announcements = announcementsOf(result.current)
		const pointer = { ...keyboardRow, input: DragInput.Pointer }

		expect(announcements.dragStart({ ...pointer, sourceId: '1' })).toBeUndefined()
		expect(announcements.dragOver({ ...pointer, sourceId: '1', targetId: '3' })).toBeUndefined()
		expect(announcements.dragEnd({ ...pointer, sourceId: '1', targetId: '3' })).toBeUndefined()
		expect(announcements.dragCancel({ ...pointer, sourceId: '1' })).toBeUndefined()
	})

	it('reports a move by the slot the held item would land in', () => {
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragOver({ ...keyboardRow, sourceId: '1', targetId: '3' })).toBe(
			'Moved the row to position 3 of 3.',
		)
	})

	it('says nothing about a self-hover', () => {
		// Normal once a sortable has displaced its first neighbour: the source occupies its
		// destination and the collision resolves to it, so it means "no new neighbour".
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragOver({ ...keyboardRow, sourceId: '2', targetId: '2' })).toBeUndefined()
	})

	it('says nothing about an id the drag counts nowhere', () => {
		const { result } = renderHook(useTable)
		const announcements = announcementsOf(result.current)

		expect(announcements.dragStart({ ...keyboardRow, sourceId: 'gone' })).toBeUndefined()
		expect(announcements.dragStart({ ...keyboardColumn, sourceId: 'gone' })).toBeUndefined()
	})

	it('counts a row in the published window when a virtualized body declared one', () => {
		// The window is the list the drag's own index space agrees with, which is why it wins — and
		// why a 10 000-row grid announces a position within the rows on screen. A reader rather than
		// an array, because the window moves under a drag's auto-scroll.
		const { result } = renderHook(useTable)
		const announcements = buildDndAnnouncements(
			() => result.current,
			() => defaultMessages,
			() => ['2', '3'],
		)

		expect(announcements.dragStart({ ...keyboardRow, sourceId: '3' })).toBe('Picked up row 2 of 2.')
	})

	it('names the column that moved, not the one it displaced', () => {
		/*
		 * REGRESSION. A drag of `name` onto `price` announced "Moved column price…" — the displaced
		 * column, which reads as though the wrong column had been picked up. The sentence is about the
		 * held item; only the *position* belongs to the neighbour it reached.
		 */
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragOver({ ...keyboardColumn, sourceId: 'name', targetId: 'price' })).toBe(
			'Moved column Name to position 2 of 2.',
		)
	})

	it('drops a row at the position the move produced, not the one it started from', () => {
		/*
		 * The uncontrolled path, with the re-render flushed — the one arrangement the old state-reading
		 * implementation also got right, kept because it is what an adapter actually drives and because
		 * the derived answer has to agree with the committed one. The case that **discriminates** is
		 * the controlled grid below, where nothing re-renders at all.
		 */
		const { result } = renderHook(useOrderedTable)
		const table = result.current
		const announcements = announcementsOf(table)

		announcements.dragStart({ ...keyboardRow, sourceId: '1' })
		act(() => {
			table.ordering.dropRow('1', '3')
		})

		const landed = getRowDropOrder(result.current).findIndex((row) => row.id === '1') + 1
		expect(landed).toBe(3)
		expect(announcements.dragEnd({ ...keyboardRow, sourceId: '1', targetId: '3' })).toBe(
			`Dropped the row at position ${String(landed)} of 3.`,
		)
	})

	it('drops at the post-move position in a controlled grid, where nothing re-renders at all', () => {
		/*
		 * REGRESSION, and the case no state read can serve. A controlled grid sends the move to
		 * `onChange` and the consumer re-renders on its own schedule — asynchronously, or never — so at
		 * the moment the sentence is built the grid still holds the pre-drop arrangement. Driven here by
		 * a consumer that swallows the change: the position must still be the one the move produced.
		 */
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				getRowId: (row) => String(row.id),
				// Controlled, and deliberately inert: the order never changes.
				ordering: { row: { onChange: () => undefined } },
			}),
		)
		const announcements = announcementsOf(result.current)

		announcements.dragStart({ ...keyboardRow, sourceId: '1' })
		act(() => {
			result.current.ordering.dropRow('1', '3')
		})

		// The grid never moved the row, so a position read off it would still be 1.
		expect(getRowDropOrder(result.current).findIndex((row) => row.id === '1')).toBe(0)
		expect(announcements.dragEnd({ ...keyboardRow, sourceId: '1', targetId: '3' })).toBe(
			'Dropped the row at position 3 of 3.',
		)
	})

	it('names the dropped column and the slot it reached', () => {
		const { result } = renderHook(useTable)
		const announcements = announcementsOf(result.current)

		announcements.dragStart({ ...keyboardColumn, sourceId: 'name' })

		expect(announcements.dragEnd({ ...keyboardColumn, sourceId: 'name', targetId: 'price' })).toBe(
			'Dropped column Name at position 2 of 2.',
		)
	})

	it('says nothing about a drop the core will refuse', () => {
		/*
		 * The gate a derived sentence needs. The position is spliced from the pickup snapshot, so it
		 * describes what the drag intended — and a move the core turns into a no-op would otherwise be
		 * narrated as a confident landing nothing moved to. Driven by a sorted grid, where `dropRow`
		 * refuses every move because the order is recomputed from the data.
		 */
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				getRowId: (row) => String(row.id),
				ordering: { row: true },
				sorting: true,
				initialState: { sorting: [{ id: 'name', desc: false }] },
			}),
		)
		const announcements = announcementsOf(result.current)

		// The pickup still speaks: the row is somewhere, and that is all it claims.
		expect(announcements.dragStart({ ...keyboardRow, sourceId: '1' })).toBeDefined()
		expect(result.current.ordering.canDropRow('1', '3')).toBe(false)
		expect(announcements.dragEnd({ ...keyboardRow, sourceId: '1', targetId: '3' })).toBeUndefined()
	})

	it('says nothing about a column drop the core will refuse', () => {
		// The column half of the same gate: `ordering: false` fixes a column's place, so `canDropColumn`
		// refuses it as a source and no landing is described.
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: createColumns<User>([
					{ accessorKey: 'name', header: 'Name', ordering: false },
					{ accessorKey: 'price', header: 'Price' },
				]),
				getRowId: (row) => String(row.id),
				ordering: { column: true },
			}),
		)
		const announcements = announcementsOf(result.current)

		announcements.dragStart({ ...keyboardColumn, sourceId: 'name' })

		expect(announcements.dragEnd({ ...keyboardColumn, sourceId: 'name', targetId: 'price' })).toBeUndefined()
	})

	it('says nothing about a drop whose pickup was never announced', () => {
		// The landing position is derived from the list as it stood at pickup, so without that list
		// there is no honest number — and silence beats a wrong one.
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragEnd({ ...keyboardRow, sourceId: '1', targetId: '3' })).toBeUndefined()
	})

	it('reads the window at announce time, not when the bag was built', () => {
		/*
		 * The reason the third argument is a reader rather than an array. A virtualized body
		 * republishes its window on every auto-scroll frame without the provider above it
		 * re-rendering, so a captured list is stale by the second frame of a drag — and the bag is
		 * built once, so it is not rebuilt in between either.
		 */
		const { result } = renderHook(useTable)
		let window: readonly string[] = ['1', '2', '3']
		const announcements = buildDndAnnouncements(
			() => result.current,
			() => defaultMessages,
			() => window,
		)

		expect(announcements.dragStart({ ...keyboardRow, sourceId: '3' })).toBe('Picked up row 3 of 3.')

		window = ['3']

		expect(announcements.dragStart({ ...keyboardRow, sourceId: '3' })).toBe('Picked up row 1 of 1.')
	})

	it('announces in the dictionary current at announce time, not the one the bag was built with', () => {
		/*
		 * REGRESSION. The bag is built **once** — the drag library's plugin registry reuses one
		 * instance per constructor and `Accessibility` reads `announcements` in its constructor alone,
		 * so a bag rebuilt per render never reaches the live region. A locale switched after mount
		 * therefore has to arrive through the callbacks, which is why both of the first two arguments
		 * are readers.
		 */
		const { result } = renderHook(useTable)
		let messages: GridMessages = defaultMessages
		const announcements = buildDndAnnouncements(
			() => result.current,
			() => messages,
			() => null,
		)

		expect(announcements.dragStart({ ...keyboardRow, sourceId: '1' })).toBe('Picked up row 1 of 3.')

		messages = resolveMessages({
			ordering: { rowPickedUp: ({ position, total }) => `Взята строка ${String(position)} из ${String(total)}.` },
		})

		expect(announcements.dragStart({ ...keyboardRow, sourceId: '1' })).toBe('Взята строка 1 из 3.')
	})

	it('cancels with the position the item is back at', () => {
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).dragCancel({ ...keyboardRow, sourceId: '1' })).toBe(
			'Cancelled, the row is back at position 1 of 3.',
		)
	})

	it('takes the instructions text from the catalogue', () => {
		const { result } = renderHook(useTable)

		expect(announcementsOf(result.current).instructions).toBe(defaultMessages.ordering.instructions)
	})
})
