'use client'

import { useSelector } from '@tanstack/react-store'

import type { DataTable } from './types'
import type { TableFeatures, TableState } from '@tanstack/table-core'

/**
 * Options for the grid's selector hooks — {@link useDataGridSelector}, `useDataGridState` and
 * `useGridContext`.
 *
 * Structurally the same as `@tanstack/react-store`'s `UseSelectorOptions`, which is what the
 * hooks hand it to. It is declared here rather than imported so that this package's `.d.ts` names
 * no type from `@tanstack/react-store` — the same `TS2742` class `GridContextAtom` avoids.
 */
export type DataGridSelectorOptions<TSelected> = {
	/**
	 * Decides whether a new selection is the same as the previous one; the component re-renders
	 * only when it returns `false`. Defaults to strict equality. Pass {@link shallow} for a selector
	 * that builds an object or array, so it re-renders when a field changes rather than on every
	 * store change.
	 */
	compare?: (a: TSelected, b: TSelected) => boolean
}

/**
 * Subscribe to a slice of a table's state, given the table explicitly.
 *
 * The context-bound form is `useDataGridState`; reach for this one when the table is not in
 * context — reading grid state from a sibling component, or from outside `<DataGrid>`.
 *
 * The component re-renders only when the selection changes, judged by `options.compare` —
 * strict equality unless one is passed. Direct field access (`(s) => s.sorting`) and primitive
 * computations (`(s) => s.columnFilters.length`) need nothing more: each `TableState` field keeps
 * its reference until that field is written.
 *
 * A selector may build a fresh object or array. The selection is memoised against the snapshot,
 * so that renders fine; but under strict equality every store change produces a new selection
 * and re-renders the component, whatever slice changed. Pass `compare: shallow` and it re-renders
 * only when one of the object's fields does.
 *
 * Field stability comes from v9's atoms: `table.store` is a **readonly derived atom** that
 * rebuilds the snapshot by reading `table.atoms[key].get()` per slice, under `compare: shallow`
 * (`table-core/dist/core/table/constructTable.js:103-112`). So each field is the slice atom's
 * own value — stable until that atom is written — and the snapshot object itself keeps its
 * identity while every slice is unchanged.
 *
 * @example
 *   const table = useDataGrid({ data, columns, sorting: true })
 *   const sorting = useDataGridSelector(table, (s) => s.sorting)
 *   const filterCount = useDataGridSelector(table, (s) => s.columnFilters.length)
 *
 * @example A derived object, re-rendering only when one of its fields changes
 *   const summary = useDataGridSelector(
 *     table,
 *     (s) => ({ sorted: s.sorting.length, filtered: s.columnFilters.length }),
 *     { compare: shallow },
 *   )
 */
export function useDataGridSelector<TFeatures extends TableFeatures, TRow extends object, TSelected>(
	table: DataTable<TFeatures, TRow>,
	selector: (state: TableState<TFeatures>) => TSelected,
	options?: DataGridSelectorOptions<TSelected>,
): TSelected {
	// `table.store` is built once in `constructTable` and never replaced, so the subscription
	// `useSelector` derives from it is stable for the table's life. Its `get()` is the one getter
	// both the client and the server read: v9 has no server-snapshot concept, and
	// `table.initialState` is the value to pass if a frozen server read is ever wanted.
	return useSelector(table.store, selector, options)
}
