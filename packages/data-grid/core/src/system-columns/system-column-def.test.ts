import {
	columnPinningFeature,
	columnSizingFeature,
	createExpandedRowModel,
	rowExpandingFeature,
	rowSelectionFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createTable } from '../create-table'
import { deletingFeature } from '../features/deleting'

import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

type Row = { id: string; name: string; children?: Row[] }

const DATA: Row[] = [{ id: '1', name: 'Alice' }]
const COLUMNS = [{ accessorKey: 'name' as const }]

const noop = (): void => undefined

/**
 * `deletingFeature` alone. Every case in this file configures `deleting` — it is what mounts the
 * `__actions__` column they are about — so the feature belongs in the set: a `deleting` config
 * without it is the misconfiguration `createTable` warns on, and this file used to emit that
 * warning on most of its runs.
 */
const DELETING = tableFeatures({ deletingFeature })

const SELECTION = tableFeatures({ rowSelectionFeature })

const SELECTION_AND_EXPANDING = tableFeatures({
	rowSelectionFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	deletingFeature,
})

/**
 * The same pair plus `columnSizingFeature`. A system column's `width` resolves onto `size` /
 * `minSize` / `maxSize`, which are options of that feature — without it registered the keys are
 * neither read by the table nor nameable on its column defs.
 */
const SELECTION_AND_EXPANDING_SIZED = tableFeatures({
	rowSelectionFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	columnSizingFeature,
})

/** `columnPinningFeature` owns the `columnPinning` slice a system column's pin is recorded in. */
const COLUMN_PINNING = tableFeatures({ columnPinningFeature, deletingFeature })

/** The same slice, for the grids whose system column is the selection one. */
const SELECTION_PINNING = tableFeatures({ rowSelectionFeature, columnPinningFeature })

/**
 * The three auto-injected columns took no configuration at all: their header rendered
 * nothing, their width was a constant, and their pinning was decided for them — with the
 * expand column, alone among the three, pinned nowhere. `selection.column`,
 * `expanding.column` and `rowActions.column` give them the same column vocabulary every
 * other column has.
 */
describe('system column defaults', () => {
	it('pins all three system columns, expand included', () => {
		const table = createTable({
			features: SELECTION_AND_EXPANDING,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			expanding: true,
			deleting: { onDelete: noop },
		})

		const sideOf = (id: string) => {
			const pinning = table.getColumn(id)?.columnDef.meta?.pinning
			return pinning !== false && pinning !== undefined ? pinning.side : undefined
		}

		expect(sideOf(SELECTION_COLUMN_ID)).toBe('start')
		// Was pinned nowhere, so a horizontally scrolled grid kept the checkbox and lost the
		// chevron of the very same row.
		expect(sideOf(EXPAND_COLUMN_ID)).toBe('start')
		expect(sideOf(ACTIONS_COLUMN_ID)).toBe('end')
	})
})

describe('SystemColumnDef', () => {
	it('labels the actions column, which had no route to a header at all', () => {
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { header: 'Actions' } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.systemHeader).toBe('Actions')
	})

	it('takes the scalar and object width forms a normal column takes', () => {
		const table = createTable({
			features: SELECTION_AND_EXPANDING_SIZED,
			data: DATA,
			columns: COLUMNS,
			selection: { column: { width: 60 } },
			expanding: { column: { width: { default: 72, min: 48, max: 96 } } },
		})

		const selection = table.getColumn(SELECTION_COLUMN_ID)?.columnDef
		const expand = table.getColumn(EXPAND_COLUMN_ID)?.columnDef

		expect(selection?.size).toBe(60)
		expect(expand?.size).toBe(72)
		expect(expand?.minSize).toBe(48)
		expect(expand?.maxSize).toBe(96)
	})

	it('unpins the actions column on request — the narrow-grid case', () => {
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { pinning: false } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.pinning).toBe(false)
		expect(table.store.state.columnPinning.end).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('unpins the checkbox column on request, leaving it an ordinary first column', () => {
		const table = createTable({
			features: SELECTION_PINNING,
			data: DATA,
			columns: COLUMNS,
			selection: { column: { pinning: false } },
		})

		expect(table.getColumn(SELECTION_COLUMN_ID)?.columnDef.meta?.pinning).toBe(false)
		expect(table.store.state.columnPinning.start).not.toContain(SELECTION_COLUMN_ID)
		// Unpinning moves nothing: the column is injected first either way, so what changes is
		// whether it sticks to the start edge under horizontal scroll.
		expect(table.getAllLeafColumns().map((column) => column.id)).toEqual([SELECTION_COLUMN_ID, 'name'])
	})

	it('normalizes the scalar align form the way a normal column does', () => {
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { align: 'center' } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.align).toEqual({
			header: 'center',
			cell: 'center',
			footer: 'center',
		})
	})

	it('carries the class names through, under the column option names', () => {
		const table = createTable({
			features: SELECTION,
			data: DATA,
			columns: COLUMNS,
			selection: { column: { headerClassName: 'th-pick', cellClassName: 'td-pick' } },
		})

		const meta = table.getColumn(SELECTION_COLUMN_ID)?.columnDef.meta
		expect(meta?.headerClassName).toBe('th-pick')
		expect(meta?.cellClassName).toBe('td-pick')
	})
})
