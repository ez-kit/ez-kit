import type { DataTable, GridFeatures } from '../types'
import type { Row } from '@tanstack/table-core'

/**
 * The rows a drag counts its indices in: **every row the body renders, in the order it renders them**
 * — the pinned top band, then the centre, then the pinned bottom band, which is exactly what
 * `body.tsx` and `virtual-body.tsx` put in the DOM.
 *
 * **This list has exactly one reader: the rows registering their own positions in it.** A drop is
 * reported as an id and committed with `dropRow`, which takes two row **ids** and resolves them
 * against the table's own model — so nothing reads a position back out of here, and nothing requires
 * this list to be the row model itself. It used to have a second reader, `GridDndProvider` resolving
 * a landing index, and that is exactly what a virtualized body's auto-scroll broke: the two sides
 * disagreed about a list one of them was renumbering mid-gesture. `DndDropEvent` records the
 * measurement.
 *
 * **This replaced `row.index`, which was wrong whenever the grid was doing anything.** TanStack's
 * `row.index` is a row's position among its **parent's** children in the *core* model, and it agrees
 * with a rendered position only on page one of a flat, unfiltered grid:
 *
 * - On page two of a paginated grid the indices start at the page offset — `10..19` for ten rows.
 * - Under a column filter the surviving rows keep their original indices, so the run has gaps.
 * - With tree rows a sub-row's index restarts from `0` and **duplicates** a top-level row's.
 *
 * Each breaks the **density** the drag library requires — exactly `0..n-1`, no gap and no duplicate
 * per group, measured in `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin` and recorded on
 * `DragSpec.index`. The failure is silent in every case: the handle works, the pointer moves, nothing
 * displaces and nothing commits. Worse, the plugin's check spans **every** group, so a broken row
 * space kills column dragging in the same grid too.
 *
 * **Why the three bands concatenated rather than `getRowModel().rows`, which is the obvious answer.**
 * Because they are not the same set. With `keepPinnedRows` — which defaults to `true` and nothing
 * here changes — `getTopRows()` / `getBottomRows()` resolve a pinned row out of the *pre-paginated*
 * model, falling back to the *core* model (`rowPinningFeature.utils.js`), so a row pinned on page one
 * keeps rendering on page two while having left `getRowModel().rows` entirely; a filter that excludes
 * it does the same without any pagination. Reading the row model would then hand that row a `-1`. The
 * concatenation also puts the indices in the order the rows are drawn, which is what the library's
 * projection displaces by — with the row model, a bottom-pinned row is drawn last and numbered
 * somewhere in the middle, so a drag near it displaces a row at the other end of the table.
 *
 * A drop across a band is refused by `dropRow`, the way a drop across a header group is refused by
 * `dropColumn`, so the bands need no index space of their own.
 *
 * **What this does not cover is a virtualized body**, which renders a window: the rows outside it
 * register nothing, so a space derived from the whole model has gaps and the row axis does not drag.
 * That body therefore does not use this function — it declares what it renders, and
 * {@link getRowDropIndex} prefers the declaration. This one stays the answer for the two bodies whose
 * rendered set *is* derivable.
 *
 * Read on the row's own render path, so it is `O(n)` per row and `O(n²)` per body — which is why every
 * caller gates it on the drag adapter being present first, the way `header-cell.tsx` gates its own
 * lookup. A grid with no drag must not pay for it, and most grids have none.
 */
export function getRowDropOrder<TRow extends object>(table: DataTable<GridFeatures, TRow>): Row<GridFeatures, TRow>[] {
	// `enableRowPinning` rather than a feature guard: this mirrors exactly what `body.tsx` and
	// `virtual-body.tsx` branch on to decide which lists they render, and the three must not diverge.
	if (table.options.enableRowPinning !== true) return table.getRowModel().rows

	return [...table.getTopRows(), ...table.getCenterRows(), ...table.getBottomRows()]
}

/**
 * Where a row sits in the drag's index space, or `-1`.
 *
 * `published` is the list a **virtualized** body declares it is rendering — the window plus the row
 * being held mounted through a drag. It wins when present, because in that body the rendered set is
 * not derivable from the table: it is a function of the scroll offset and of the gesture in flight.
 * Everything else — the built-in non-virtual body, a hand-written one — passes `null` and gets the
 * derivation above, which is what it renders.
 *
 * This is the density the library demands, and the reason a virtualized grid could not drag at all:
 * the window's rows registered their positions in the *whole* model, so the zeroth sortable of a
 * window starting at row 5 claimed index `5`, and `OptimisticSortingPlugin` returned on the first
 * frame. See {@link getRowDropOrder} for the same failure arriving through pagination and filters.
 */
export function getRowDropIndex<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
	published: readonly string[] | null,
	rowId: string,
): number {
	if (published) return published.indexOf(rowId)

	return getRowDropOrder(table).findIndex((candidate) => candidate.id === rowId)
}
