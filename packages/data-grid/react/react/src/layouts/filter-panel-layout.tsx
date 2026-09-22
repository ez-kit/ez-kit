import { ActionBar } from '../data-grid/action-bar'
import { ActiveFiltersBar } from '../data-grid/active-filters-bar'
import { BottomBar } from '../data-grid/bottom-bar'
import { DataGridTable } from '../data-grid/table'
import { Toolbar } from '../data-grid/toolbar'

import { useToolbarEnd, useToolbarStart } from './toolbar-controls'

/**
 * {@link BottomBarLayout} with `<DataGrid.FilterPanel/>` in the toolbar beside the search box,
 * and the active-filters strip under it — the arrangement every issue tracker uses.
 *
 * **The panel is the whole of the name because it is the whole of the difference.** Search and
 * the trailing controls are not distinguishing: `useToolbarStart` / `useToolbarEnd` put the same
 * ones in every preset here, including {@link DefaultLayout}. This one passes
 * `{ filterPanel: true }` and mounts two more members; that is all it is. The preset was called
 * `SearchFiltersActionsLayout` for a while, which promised a difference in two of the three
 * things it enumerated and stayed silent about the one that was real.
 *
 * It used to cost five options at once:
 *
 * ```tsx
 * <DataGrid
 *   globalFiltering={{ toolbar: 'start' }}
 *   filtering={{ panel: 'toolbar', toolbar: true, variant: 'panel' }}
 *   visibility={{ toolbar: true }}
 *   sorting={{ toolbar: true }}
 *   pagination={{ pageSizer: 'footer' }}
 * />
 * ```
 *
 * The chips strip goes under the toolbar, where `filtering: { chips: 'above' }` put it, and the
 * page sizer shares the bottom bar with the page controls.
 *
 * Note the panel here **adds** to the header's own filter controls rather than replacing them,
 * because the built-in header cell still renders each column's control. Both write to one
 * `columnFilters` slice, which is two inputs bound to one value — a grid with filters in the
 * header *and* in a panel, which no value of the removed `filtering.variant` could express. A
 * layout that wants the panel to be the only filter UI expands the table down to
 * `<DataGrid.HeaderCell>` and renders everything but `filter`.
 */
export function FilterPanelLayout() {
	const start = useToolbarStart({ filterPanel: true })
	const end = useToolbarEnd()

	return (
		<>
			<Toolbar
				start={start}
				end={end}
			/>
			<ActiveFiltersBar />
			<DataGridTable />
			<BottomBar />
			<ActionBar />
		</>
	)
}
