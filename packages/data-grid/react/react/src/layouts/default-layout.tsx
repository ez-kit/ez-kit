import { ActionBar } from '../data-grid/action-bar'
import { Pagination } from '../data-grid/pagination'
import { DataGridTable } from '../data-grid/table'
import { Toolbar } from '../data-grid/toolbar'

import { useToolbarEnd, useToolbarStart } from './toolbar-controls'

/**
 * Toolbar, table, pagination — the everyday grid, and the preset each UI kit binds to
 * `core.Layout` so that `<DataGrid data columns/>` from a kit keeps rendering what it always did.
 *
 * It composes the toolbar contents **explicitly**, which is the whole point of the change: the
 * eight options that used to tell `<Toolbar>` what to mount (`sorting.toolbar`,
 * `visibility.toolbar`, `filtering.toolbar`, `globalFiltering.toolbar`, `pagination.pageSizer`,
 * `filtering.panel`, `filtering.chips`, `filtering.variant`) are gone, and the arrangement they
 * described is these five lines of JSX. Each control is still gated on its feature being on —
 * see `useToolbarStart` / `useToolbarEnd`, which is where that lives so all four presets gate
 * identically.
 *
 * **The action bar goes last, and where it goes is now a layout's decision like any other.**
 * That position is right for `floating`, which is the default: shadcn's floating bar is
 * positioned out of a zero-height *sticky* anchor, which has to sit after the rows it overlays
 * to overlay them, and while heroui portals its own to a fixed overlay — where tree position
 * changes nothing visually — document order still keeps it out of the tab order until there
 * is something to act on. It is wrong for `selection: { bar: 'inline' }`, whose bar is a block
 * in the flow and belongs above the table — so a grid that asks for `inline` writes its own
 * layout and puts the bar first:
 *
 * ```tsx
 * function InlineBarLayout() {
 *   return (
 *     <>
 *       <DataGrid.ActionBar />
 *       <DataGrid.Toolbar />
 *       <DataGrid.Table />
 *       <DataGrid.Pagination />
 *     </>
 *   )
 * }
 * ```
 *
 * A `GridShell` wrapper used to branch on the variant and place them for you. It was the last
 * placement option left standing — a config value deciding where an element renders — and it is
 * gone for the same reason the other eight are: composition is stated in JSX.
 *
 * **It mounts no page sizer, and no active-filters strip.** Both are a deliberate gap rather
 * than an oversight, and the sizer is the one that will surprise you: `pagination.pageSizer`
 * defaulted to "mounted in the toolbar iff the author wrote `items`", and that gate read the
 * **authored** config. It cannot be reproduced here — `grid.pagination.items` falls back to
 * `DATA_GRID_DEFAULTS.pagination.items` under any paged pagination, so gating on it would put a
 * selector on *every* paginated grid, which is a louder default than the old one rather than a
 * restoration of it. The faithful alternative is a resolved "the author named a list" flag,
 * i.e. a mount decision back in the config — the thing this change removes.
 *
 * So ask for one:
 *
 * ```tsx
 * <DataGrid.Toolbar start={<DataGrid.PageSizer />} end={…} />   // in the toolbar
 * ```
 *
 * or reach for {@link BottomBarLayout}, which puts the sizer beside the page controls. The
 * chips strip is the same story: write `<DataGrid.ActiveFiltersBar />`, or use
 * {@link SearchFiltersActionsLayout}, which carries one.
 */
export function DefaultLayout() {
	const start = useToolbarStart()
	const end = useToolbarEnd()

	return (
		<>
			<Toolbar
				start={start}
				end={end}
			/>
			<DataGridTable />
			<Pagination />
			<ActionBar />
		</>
	)
}
