import type { DataTable, GridFeatures } from '../types'
import type { Column } from '@tanstack/table-core'

/**
 * The leaf columns the visibility panel lists, in the order it lists them.
 *
 * **One function, three readers, and that is the point.** `<DataGrid.VisibilityTrigger>` builds its
 * `VisibilityColumnItem[]` from it, `<DataGrid.VisibilityItem>` finds an item's drag index in it,
 * and `GridDndProvider` resolves a panel drop's target from it. Those three have to agree exactly:
 * the drag's index space is this list's positions, and an item registered at a position this list
 * does not give it breaks the space's **density** — which silently kills the drag for the whole
 * surface (`dnd/types.ts` on `DragSpec.index` has the measurement). A second copy of the filter is
 * the obvious way for them to drift.
 *
 * The order is `getAllLeafColumns()`, which is **the `columnOrder` order with the hidden columns
 * left in** — not the declaration order, and not the visual one `getVisualLeafColumns` gives the
 * header. Worth being exact about, because all three are plausible and only one is right:
 * `table_getAllLeafColumns` pipes the flattened leaves through `getOrderColumns`, which applies
 * `columnOrder` and falls back to the declaration order only when that slice is empty (read in
 * `@tanstack/table-core@9.2.4`). That is what makes this list usable here — a committed reorder
 * visibly reorders the panel, which is what the browser spec reads back.
 *
 * What it is *not* is the header's list: that one is `getVisualLeafColumns`, which is the visible
 * leaves arranged by pin band, and a hidden column has no place in it at all. So the two surfaces of
 * the column axis count their indices in two different lists — see `DragSurface`.
 *
 * One caveat this inherits and does not control: under `groupedColumnMode: 'remove'` a grouped
 * column is dropped from this list while remaining in `columnOrder`, so it disappears from the panel
 * while a grouping is applied. Harmless for density, since all three readers share this helper.
 *
 * System columns are never listed: selection, expanding and the row-actions column hold fixed
 * places in the layout and neither hide nor move. Beyond that the list widens under
 * `ordering.column.visibilityMenu`, because a menu that offers moves has to show every column the
 * order contains — a list that skipped some of them could not be read as the order.
 */
export function getVisibilityPanelColumns<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
): Column<GridFeatures, TRow>[] {
	const withOrdering = table.grid.ordering.visibilityMenu

	return table
		.getAllLeafColumns()
		.filter((column) => column.columnDef.meta?.isSystemColumn !== true && (withOrdering || column.getCanHide()))
}
