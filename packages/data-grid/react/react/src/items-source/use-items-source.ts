import { useDataGridTable } from '../data-grid/table-context'

import { useItemsLists } from './use-items-lists'

import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { ItemsMeta } from './lists'
import type { ItemsSourceSlot, ItemsSourceSnapshot } from './types'

const NO_META: ItemsMeta = {}

/**
 * The value list a column offers at one place — its cells, its filter, its editor or its create
 * field — as that place reads it: the items, whether they are still loading, and the hook's error.
 *
 * The same list the grid's own controls read, resolved by the same inheritance (`creating →
 * editing → cell`, `filtering → cell`), and the same source: calling this for a column whose list
 * comes from `useItems` keeps that one hook running for as long as the component is mounted, and
 * shares its result with the grid rather than calling the hook a second time. A field from
 * `filtering.fields` is read by its id the same way.
 *
 * `undefined` when the column states no list for that place. Only a `select` / `badge` column has a
 * base list (`cell.config.items` / `useItems`), so on any other cell type the `'cell'` slot is
 * always `undefined`, and the other three answer only with the list that level states itself —
 * `filtering.useItems`, `editing.items` and so on. Must be rendered inside `<DataGrid>`.
 *
 * @example A custom cell type labelling its values from the column's list
 * ```tsx
 * const warehouses = useItemsSource('warehouse', 'cell')
 * if (warehouses?.isLoading) return <Skeleton />
 * ```
 */
export function useItemsSource(columnId: string, slot: ItemsSourceSlot): ItemsSourceSnapshot | undefined {
	const table = useDataGridTable()
	const meta = metaOf(table, columnId)
	return useItemsLists(columnId, meta, slot).options
}

function metaOf(table: DataTable<GridFeatures, ErasedRow>, id: string): ItemsMeta {
	const field = table.grid.filtering.fields.find((candidate) => candidate.id === id)
	if (field) return { cell: field.cell, filtering: field.filtering }
	const column = table.getAllLeafColumns().find((candidate) => candidate.id === id)
	return (column?.columnDef.meta as ItemsMeta | undefined) ?? NO_META
}
