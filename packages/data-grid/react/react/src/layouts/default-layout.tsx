import { Pagination } from '../data-grid/pagination'
import { DataGridTable } from '../data-grid/table'
import { Toolbar } from '../data-grid/toolbar'

import { useActionBarSlots } from './action-bar-slots'
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
 * identically — and the sort builder and clear-filters are not mounted at all: a preset mounts a
 * control only when the grid has no other way into its feature, and the header click sorts.
 *
 * **The action bar goes where its variant needs it** — see `useActionBarSlots`. A
 * `floating` bar, the default, goes last: it overlays the rows, and coming last keeps it out of
 * the tab order until there is something to act on. An `inline` bar is a strip in the flow, so it
 * goes between the toolbar and the table, beside the rows it acts on. Every preset does the same,
 * so a grid that turns on `selection: { bar: 'inline' }` looks right without a layout of its own.
 *
 * A layout of one's own still puts the bar wherever it writes it — for an inline bar below the
 * table, say:
 *
 * ```tsx
 * function BarBelowLayout() {
 *   return (
 *     <>
 *       <DataGrid.Toolbar />
 *       <DataGrid.Table />
 *       <DataGrid.Pagination />
 *       <DataGrid.ActionBar />
 *     </>
 *   )
 * }
 * ```
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
 * {@link FilterPanelLayout}, which carries one.
 */
export function DefaultLayout() {
	const start = useToolbarStart()
	const end = useToolbarEnd()
	const actionBar = useActionBarSlots()

	return (
		<>
			<Toolbar
				start={start}
				end={end}
			/>
			{actionBar.top}
			<DataGridTable />
			<Pagination />
			{actionBar.bottom}
		</>
	)
}
