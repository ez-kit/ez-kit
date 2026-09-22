import { CreatingMode } from '@ez-kit/data-grid-core'

import { ClearFiltersButton } from '../data-grid/clear-filters-button'
import { CreateTrigger } from '../data-grid/create-trigger'
import { FilterPanel } from '../data-grid/filter-panel'
import { GlobalFilterInput } from '../data-grid/global-filter-input'
import { SortMenuTrigger } from '../data-grid/sort-menu-trigger'
import { useDataGridTable } from '../data-grid/table-context'
import { VisibilityTrigger } from '../data-grid/visibility-trigger'
import { filtersRows } from '../utils/filters-rows'

import type { DataTable, GridFeatures } from '../types'
import type { ReactNode } from 'react'

/**
 * Which of the shared toolbar controls this grid has anything for.
 *
 * Every preset in this directory gates on the same four answers, so they are derived once. The
 * flags come from the resolved bag — `grid.sorting`, `grid.visibility`,
 * `grid.globalFiltering` — and never from a `*.toolbar` option: those options are gone, and
 * *mounting* is now what a layout says by writing the component or not.
 *
 * Gating is not cosmetic. Each of these controls reads its feature's API, which a grid that
 * never registered the feature does not have, so an ungated one is a render-time `TypeError`
 * on a narrow grid — the case `feature-optionality.test.tsx` renders. `ClearFiltersButton`
 * subscribes to `state.columnFilters`, which is why it is gated on the grid filtering rows at
 * all rather than on its own hidden-when-empty behaviour.
 */
type ToolbarControls = {
	globalFilter: boolean
	clearFilters: boolean
	create: boolean
	sorting: boolean
	visibility: boolean
}

function useToolbarControls(): ToolbarControls {
	// Reads only config refs, no state, so this does not subscribe: a layout that re-rendered on
	// every filter keystroke would cascade into Body and Table, which depend on none of it.
	const table: DataTable<GridFeatures, never> = useDataGridTable()
	const grid = table.grid

	return {
		globalFilter: grid.globalFiltering !== undefined,
		clearFilters: filtersRows(table),
		// A pinned-row create form has its own affordance in the grid body, so a toolbar trigger
		// beside it would be a second way to start the same draft.
		create: Boolean(table.options.creating) && table.options.creating?.mode !== CreatingMode.PinRow,
		sorting: grid.sorting,
		visibility: grid.visibility,
	}
}

/**
 * The toolbar's leading group: the search box, and — where a preset asks for it — the filter
 * panel beside it. `undefined` when the group would be empty, so `<Toolbar>` renders nothing
 * rather than an empty bar.
 *
 * Search first, then the filters: that is the order the removed
 * `globalFiltering.toolbar: 'start'` existed to produce, and here it is what the JSX says.
 */
export function useToolbarStart({ filterPanel = false }: { filterPanel?: boolean } = {}): ReactNode {
	const { globalFilter } = useToolbarControls()
	if (!globalFilter && !filterPanel) return undefined
	return (
		<>
			{globalFilter && <GlobalFilterInput />}
			{filterPanel && <FilterPanel />}
		</>
	)
}

/**
 * The toolbar's trailing group, shared by every preset here: clear-filters, "+ Add", the
 * multi-sort builder, the column-visibility toggle. `undefined` when the group would be empty.
 */
export function useToolbarEnd(): ReactNode {
	const { clearFilters, create, sorting, visibility } = useToolbarControls()
	if (!clearFilters && !create && !sorting && !visibility) return undefined
	return (
		<>
			{clearFilters && <ClearFiltersButton />}
			{create && <CreateTrigger />}
			{sorting && <SortMenuTrigger />}
			{visibility && <VisibilityTrigger />}
		</>
	)
}
