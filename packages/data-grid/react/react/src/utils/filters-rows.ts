import type { DataTable, GridFeatures } from '../types'

/**
 * The grid filters rows at all — column filtering or global search is on.
 *
 * Under v8 this was `Boolean(table.options.getFilteredRowModel)`: core attached the filtered row
 * model under exactly the condition `hasColumnFiltering || hasGlobalFiltering`, so the option's
 * presence *was* the answer. In v9 the filtered row model is a slot the **consumer** puts in
 * `features`, core writes no `getFilteredRowModel` option, and that probe reads `undefined` on
 * every grid — silently turning off every per-column filter control and the whole filter panel.
 *
 * The two options below are the same two predicates, and core still writes them (it writes them
 * only in the negative, `enableColumnFilters: false` / `enableGlobalFilter: false`, which is why
 * the comparison is `!== false` rather than a truth test — absent means on, TanStack's default).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filtersRows(table: DataTable<GridFeatures, any>): boolean {
	return table.options.enableColumnFilters !== false || table.options.enableGlobalFilter !== false
}
