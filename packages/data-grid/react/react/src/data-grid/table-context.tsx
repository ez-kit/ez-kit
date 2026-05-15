import { createContext, useContext } from 'react'

import { useDataGridSelector } from '../use-data-grid-selector'

import type { DataGridInstance } from '../data-grid-instance'
import type { DataTable, TableState } from '@ez-kit/data-grid-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableContext = createContext<DataGridInstance<any> | null>(null)

export { TableContext }

/**
 * Retrieve the {@link DataGridInstance} from context. Throws when called
 * outside `<DataGrid>`. Does NOT subscribe to state changes — pair with
 * `useDataGridStore` (or `useTable`) when the caller must re-render on state
 * updates.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDataGridInstance(): DataGridInstance<any> {
	const ctx = useContext(TableContext)
	if (!ctx) {
		throw new Error('This component must be rendered inside <DataGrid>.')
	}
	return ctx
}

/**
 * Subscribe to a slice of the table state from context. Re-renders only when
 * the selected slice changes. Selector must return a referentially stable
 * value — see {@link useDataGridSelector} for the full contract.
 *
 * @example Subscribe to a slice
 *   const sorting = useDataGridStore((s) => s.sorting)
 *
 * @example Row-targeted boolean (no re-render for unrelated rows)
 *   // Stably `false` while the user edits a different row; flips exactly
 *   // when this row enters / leaves edit mode.
 *   const isEditingThisRow = useDataGridStore((s) => s.editing.rowId === row.id)
 */
export function useDataGridStore<TSelected>(selector: (state: TableState) => TSelected): TSelected {
	const instance = useDataGridInstance()
	return useDataGridSelector(instance, selector)
}

/**
 * Convenience hook that returns the live `DataTable` instance from context
 * and subscribes to state changes.
 *
 * - Without an argument — subscribes broadly: re-renders on **any**
 *   `TableState` change. Drop-in for the legacy `useTableContext()`.
 * - With a selector — re-renders only when the selected slice changes
 *   (same contract as {@link useDataGridSelector}: selector must return a
 *   referentially stable value when the underlying state hasn't changed).
 *
 * The return is always `instance.table` — call methods on it as before.
 * The selector is purely a subscription filter.
 *
 * @example Narrow a single subtree to sorting-only re-renders
 *   const table = useTable((s) => s.sorting)
 *   const headers = table.getHeaderGroups()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTable(selector: (state: TableState) => unknown = defaultSelector): DataTable<any> {
	const instance = useDataGridInstance()
	useDataGridSelector(instance, selector)
	return instance.table
}

const defaultSelector = (state: TableState): TableState => state

/**
 * @deprecated Use {@link useTable} (broad subscription, returns DataTable) or
 * {@link useDataGridInstance} (no subscription, returns DataGridInstance).
 */
export const useTableContext = useTable
