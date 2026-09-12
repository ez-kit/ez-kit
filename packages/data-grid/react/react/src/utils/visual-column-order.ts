import type { DataTable } from '@ez-kit/data-grid-core'
import type { Column } from '@tanstack/table-core'

/**
 * The visible leaf columns in the order they are actually laid out: left-pinned,
 * then centre, then right-pinned.
 *
 * Use this — never `table.getVisibleLeafColumns()` — wherever the *order* matters.
 * Despite the name, TanStack's `getVisibleLeafColumns()` is
 * `getAllLeafColumns().filter(visible)`: it keeps the **declaration** order and
 * ignores pinning entirely, while every rendered row (`row.getVisibleCells()`) and
 * every header group is `[...left, ...centre, ...right]`.
 *
 * The two agree only while the pinned columns happen to sit at the declaration
 * order's own extremes — the default, with a selection column first and an actions
 * column last, which is why this went unnoticed. Pin any other column and the
 * orders diverge: cells land in the wrong `grid-template-columns` track, so they
 * take a neighbour's width, and the sticky offsets (`getStart` / `getAfter`, which
 * are computed within a pin group and therefore in visual order) no longer match
 * the widths on screen — two right-pinned columns end up overlapping or gapped by
 * exactly the difference between their declared sizes.
 */
export function getVisualLeafColumns<TRow extends object>(table: DataTable<TRow>): Column<TRow>[] {
	return [
		...table.getLeftVisibleLeafColumns(),
		...table.getCenterVisibleLeafColumns(),
		...table.getRightVisibleLeafColumns(),
	]
}
