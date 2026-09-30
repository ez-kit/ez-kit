import type { DataTable, GridFeatures } from '../types'
import type { Row } from '@tanstack/table-core'

/**
 * The rows a drag counts its indices in: **every row the body renders, in the order it renders them**
 * — the pinned top band, then the centre, then the pinned bottom band, which is exactly what
 * `body.tsx` and `virtual-body.tsx` put in the DOM.
 *
 * `GridDndProvider` resolves a drop's `targetIndex` against this same list. The two have to be one
 * list or a drop lands on a row the pointer never passed; note that is the only thing they share —
 * `dropRow` takes row **ids**, so nothing requires this list to be the row model itself.
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
 * register nothing, so the space has gaps and the row axis does not drag. That is phase 9 of the drag
 * PRD and is not built — read the PRD's phase table rather than assuming the virtual case works.
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
