import { createGridContextStore } from './grid-context'
import { defaultResolvedGridOptions } from './resolved-options'

import type { DataTable } from '@ez-kit/data-grid-core'

/**
 * Makes a headless {@link DataTable} renderable by the React layer, and returns it.
 *
 * The only thing it does is seed the two fields the React layer hangs on the table — `grid`,
 * its resolved options, and `gridContext`, the store behind the `context` option — so that
 * both are **always** present and no compound component has to guard the property itself.
 * `useDataGrid` overwrites `grid` wholesale on its first render and writes the context store's
 * value when the merged option changes; a table built straight from `createTable` (a headless
 * test, or a consumer driving the compound components by hand) keeps the all-features-off
 * defaults and an empty context, and still renders.
 *
 * This replaced a `DataGridInstance` wrapper that carried `{ table, store, subscribe,
 * getSnapshot }`. Three of those four were the same functions already on the table —
 * `store.subscribe === table.subscribe`, `store.getSnapshot === table.getSnapshot` — and the
 * fourth, the frozen server snapshot, now lives on the table too as `getInitialSnapshot()`.
 * What was left was a wrapper whose only effect was to put every imperative call one hop
 * further away: `grid.table.creating.start()`.
 */
export function prepareDataGridTable<TRow extends object>(table: DataTable<TRow>): DataTable<TRow> {
	table.grid = defaultResolvedGridOptions()
	table.gridContext = createGridContextStore()
	return table
}
