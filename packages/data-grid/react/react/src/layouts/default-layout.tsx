import { resolveActionBarVariant } from '../data-grid/action-bar-variant'
import { DraftBar } from '../data-grid/draft-bar'
import { Pagination } from '../data-grid/pagination'
import { SelectionBar } from '../data-grid/selection-bar'
import { DataGridTable } from '../data-grid/table'
import { useDataGridTable } from '../data-grid/table-context'
import { Toolbar } from '../data-grid/toolbar'
import { ActionBarVariant } from '../types'

import { useToolbarEnd, useToolbarStart } from './toolbar-controls'

import type { ReactNode } from 'react'

/**
 * The shell the two action bars wrap, shared by every preset in this directory.
 *
 * `inline` puts them above the grid, in the flow; `floating` overlays them, so they go last and
 * document order keeps them out of the tab order until there is something to act on. That
 * ordering is unchanged from the layout this replaced — only what fills the toolbar is new.
 */
export function GridShell({ children }: { children: ReactNode }) {
	// Reads only config refs, no state, so it does not subscribe: a layout re-rendering on every
	// state mutation would cascade into Body and Table, which depend on none of it.
	const variant = resolveActionBarVariant(useDataGridTable())

	if (variant === ActionBarVariant.Inline) {
		return (
			<>
				<DraftBar />
				<SelectionBar />
				{children}
			</>
		)
	}

	return (
		<>
			{children}
			<DraftBar />
			<SelectionBar />
		</>
	)
}

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
		<GridShell>
			<Toolbar
				start={start}
				end={end}
			/>
			<DataGridTable />
			<Pagination />
		</GridShell>
	)
}
