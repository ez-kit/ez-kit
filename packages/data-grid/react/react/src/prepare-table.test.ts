import { createTable, GridDirection, RowActionsPlacement } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { prepareDataGridTable } from './prepare-table'
import { TEST_FEATURES } from './test-utils'

import type { GridFeatures } from './types'

type Row = { id: string; name: string }

function makeTable() {
	return createTable<GridFeatures, Row>({
		features: TEST_FEATURES,
		data: [{ id: '1', name: 'a' }],
		columns: [{ accessorKey: 'name', header: 'Name' }],
	})
}

/**
 * A table whose two carried-across members hold **non-default** values, so an assertion on them
 * fails when the value stops travelling rather than when it merely changes.
 */
function makeConfiguredTable() {
	return createTable<GridFeatures, Row>({
		features: TEST_FEATURES,
		data: [{ id: '1', name: 'a' }],
		columns: [{ accessorKey: 'name', header: 'Name' }],
		direction: GridDirection.Rtl,
		rowActions: { placement: RowActionsPlacement.Menu },
	})
}

describe('prepareDataGridTable', () => {
	it('returns the same table object rather than wrapping it', () => {
		const table = makeTable()
		expect(prepareDataGridTable(table)).toBe(table)
	})

	it('seeds table.grid so every compound component can read it unguarded', () => {
		const table = prepareDataGridTable(makeTable())

		expect(table.grid).toBeDefined()
		// All features off: this is a table that never went through `useDataGrid`.
		expect(table.grid.pinning.column).toBe(false)
		expect(table.grid.pagination.items).toBeUndefined()
	})

	it('merges onto the grid options core already seeded rather than replacing them', () => {
		const table = prepareDataGridTable(makeConfiguredTable())

		// `createTable` writes `table.grid` at construction and this function runs after it, so a
		// wholesale `table.grid = defaultResolvedGridOptions()` clobbers core's four members and
		// they reach nothing — compiling clean and passing every other test in this file.
		expect(table.grid.direction).toBe(GridDirection.Rtl)
		expect(table.grid.rowActions.placement).toBe(RowActionsPlacement.Menu)
	})

	// Two cases stood here, asserting `table.subscribe` / `getSnapshot` / `getInitialSnapshot`
	// existed and that the initial snapshot stayed frozen while the live one moved. v9 deleted
	// all three (pr1-outcomes §2.3, §1.1(c)) and the guarantees they tested are no longer this
	// package's to make:
	//   - the subscribe/read surface is `table.store` — a `ReadonlyStore<TableState>` that
	//     `constructTable` builds once and never replaces, which is what the three
	//     `useSyncExternalStore` sites (`use-data-grid-selector`, `state/use-extracted-state`,
	//     `use-ordered-data`) now subscribe to and read;
	//   - the frozen snapshot is `table.initialState`, which v9 resolves once at construction and
	//     never reassigns.
	// Both are upstream's own invariants, verified by upstream's tests; `prepareDataGridTable`
	// neither writes nor wraps either one, so there was nothing left here to assert.
})
