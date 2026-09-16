import { tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../column/create-columns'
import { createTable } from '../create-table'
import { rowOrderingFeature } from '../features/entry'

import { assignTableInstanceData } from './assign-instance-data'

import type { AnyTable } from './feature-state'
import type { RowOrderingApi } from '../features/ordering/row-ordering-feature'

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
]

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

/** The two members every accessor in this directory needs, and nothing else. */
const bareTable = (): AnyTable => ({ options: {}, baseAtoms: {} })

const API: RowOrderingApi = {
	canMoveRow: () => false,
	moveRow: () => undefined,
}

describe('assignTableInstanceData', () => {
	it('installs the members the feature declares', () => {
		const table = bareTable()

		assignTableInstanceData('rowOrderingFeature', table, { ordering: API })

		expect((table as { ordering?: RowOrderingApi }).ordering).toBe(API)
	})

	// The reason the helper exists rather than a cast. Each directive below is the assertion: if
	// the key or the member stopped being checked against `Table_FeatureMap`, the call would
	// compile and TypeScript would report the directive as unused (TS2578), failing the
	// type-check. Nothing here needs to run to be a test — the runtime half only keeps vitest
	// honest that the file is reached.
	it('makes a misspelled feature key and a misspelled member compile errors', () => {
		const table = bareTable()

		// @ts-expect-error 'rowOrderingFeatur' is not a key of Table_FeatureMap
		assignTableInstanceData('rowOrderingFeatur', table, { ordering: API })

		// @ts-expect-error 'orderin' is not a member rowOrderingFeature declares
		assignTableInstanceData('rowOrderingFeature', table, { orderin: API })

		// @ts-expect-error rowOrderingFeature declares `ordering`, and it is not optional
		assignTableInstanceData('rowOrderingFeature', table, {})

		// Only the two misspelled calls are errors; both still assigned something at runtime,
		// which is exactly why a cast is not good enough on its own.
		expect(table).toBeTypeOf('object')
	})

	it('is what puts `ordering` on a real table', () => {
		// The end-to-end half: `rowOrderingFeature.initTableInstanceData` calls the helper, so a
		// table that registers the feature has a working `table.ordering`.
		const table = createTable({
			features: tableFeatures({ rowOrderingFeature }),
			data: DATA,
			columns: COLUMNS,
			getRowId: (row) => row.id,
			ordering: { row: true },
		})

		expect(table.ordering.canMoveRow).toBeTypeOf('function')
		expect(table.ordering.moveRow).toBeTypeOf('function')
	})
})
