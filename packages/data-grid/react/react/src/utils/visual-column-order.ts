import type { DataTable, GridFeatures } from '../types'
import type { Column } from '@tanstack/table-core'

/**
 * The visible leaf columns in the order they are actually laid out: start-pinned,
 * then centre, then end-pinned.
 *
 * Use this — never `table.getVisibleLeafColumns()` — wherever the *order* matters.
 * Despite the name, TanStack's `getVisibleLeafColumns()` is
 * `getAllLeafColumns().filter(visible)`: it keeps the **declaration** order and
 * ignores pinning entirely, while every rendered row (`row.getVisibleCells()`) and
 * every header group is `[...start, ...centre, ...end]`.
 *
 * The two agree only while the pinned columns happen to sit at the declaration
 * order's own extremes — the default, with a selection column first and an actions
 * column last, which is why this went unnoticed. Pin any other column and the
 * orders diverge: cells land in the wrong `grid-template-columns` track, so they
 * take a neighbour's width, and the sticky offsets (`getStart` / `getAfter`, which
 * are computed within a pin group and therefore in visual order) no longer match
 * the widths on screen — two end-pinned columns end up overlapping or gapped by
 * exactly the difference between their declared sizes.
 */
export function getVisualLeafColumns<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
): Column<GridFeatures, TRow>[] {
	// `getStart…` / `getEnd…` are v9's names for v8's `getLeft…` / `getRight…`, and the positions
	// they group by are `'start'` / `'end'` for the same reason: the axis flips under RTL, so the
	// pinned edge is inline-start / inline-end, not left / right.
	return [
		...table.getStartVisibleLeafColumns(),
		...table.getCenterVisibleLeafColumns(),
		...table.getEndVisibleLeafColumns(),
	]
}
