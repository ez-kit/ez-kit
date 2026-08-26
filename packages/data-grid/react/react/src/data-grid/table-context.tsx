import { createContext, useContext } from 'react'

import { useDataGridSelector } from '../use-data-grid-selector'

import type { DataTable, TableState } from '@ez-kit/data-grid-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableContext = createContext<DataTable<any> | null>(null)

export { TableContext }

/**
 * The live `DataTable` from context. **Does not subscribe**: reading the table is not the same
 * as depending on its state, and the two used to be welded together — the old `useTable()`
 * subscribed to the entire `TableState` by default, so every component that merely wanted
 * `getVisibleLeafColumns()` re-rendered on every keystroke in a filter box.
 *
 * Pair it with {@link useDataGridState} for the slice the component actually reads.
 *
 * The row type cannot be recovered from context (one context serves grids of every row type),
 * so it is a caller-supplied parameter: `useDataGridTable<User>()` types the table, and
 * omitting it keeps the unchecked default.
 *
 * Throws when called outside `<DataGrid>`.
 *
 * @example
 * const table = useDataGridTable<User>()
 * useDataGridState((s) => s.columnVisibility) // re-render when columns appear/disappear
 * const colSpan = table.getVisibleLeafColumns().length
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDataGridTable<TRow extends object = any>(): DataTable<TRow> {
	const table = useContext(TableContext)
	if (!table) {
		throw new Error('This component must be rendered inside <DataGrid>.')
	}
	return table as DataTable<TRow>
}

/**
 * Subscribe to a slice of the table state from context. Re-renders only when the selected
 * slice changes. The selector must return a referentially stable value — see
 * {@link useDataGridSelector} for the full contract.
 *
 * @example Subscribe to a slice
 *   const sorting = useDataGridState((s) => s.sorting)
 *
 * @example Row-targeted boolean (no re-render for unrelated rows)
 *   // Stably `false` while the user edits a different row; flips exactly
 *   // when this row enters / leaves edit mode.
 *   const isEditingThisRow = useDataGridState((s) => s.editing.rowId === row.id)
 *
 * @example Deliberately broad — the snapshot itself is stable until something changes
 *   useDataGridState((s) => s)
 */
export function useDataGridState<TSelected>(selector: (state: TableState) => TSelected): TSelected {
	return useDataGridSelector(useDataGridTable(), selector)
}
