import { CreatingMode } from '@ez-kit/data-grid-core'

import { CreateTrigger } from '../data-grid/create-trigger'
import { FilterPanel } from '../data-grid/filter-panel'
import { GlobalFilterInput } from '../data-grid/global-filter-input'
import { useDataGridTable } from '../data-grid/table-context'
import { VisibilityTrigger } from '../data-grid/visibility-trigger'

import type { DataTable, GridFeatures } from '../types'
import type { ReactNode } from 'react'

/**
 * Which of the shared toolbar controls this grid has anything for.
 *
 * Every preset in this directory gates on the same three answers, so they are derived once. The
 * flags come from the resolved bag — `grid.visibility`, `grid.globalFiltering` — and never from a
 * `*.toolbar` option: those options are gone, and *mounting* is now what a layout says by writing
 * the component or not.
 *
 * **A preset mounts a feature's control only when the grid has no other way into — or back out
 * of — that feature.** Search is the only way into global filtering, the visibility toggle the only
 * way back to a hidden column, "+ Add" the only way into a draft unless the pinned-row form already
 * offers one. `SortMenuTrigger` and `ClearFiltersButton` fail that test — sorting has the header
 * click, and every filter clears in its own input — so no preset mounts them; a layout that wants
 * them writes them. Both were opt-in before the placement options went (`sorting.toolbar`,
 * `filtering.toolbar`), and gating them on "the feature is on" turned them on by accident.
 *
 * Gating is not cosmetic. Each of these controls reads its feature's API, which a grid that
 * never registered the feature does not have, so an ungated one is a render-time `TypeError`
 * on a narrow grid — the case `feature-optionality.test.tsx` renders.
 */
type ToolbarControls = {
	globalFilter: boolean
	create: boolean
	visibility: boolean
}

function useToolbarControls(): ToolbarControls {
	// Reads only config refs, no state, so this does not subscribe: a layout that re-rendered on
	// every filter keystroke would cascade into Body and Table, which depend on none of it.
	const table: DataTable<GridFeatures, never> = useDataGridTable()
	const grid = table.grid

	return {
		globalFilter: grid.globalFiltering !== undefined,
		// A pinned-row create form has its own affordance in the grid body, so a toolbar trigger
		// beside it would be a second way to start the same draft.
		create: Boolean(table.options.creating) && table.options.creating?.mode !== CreatingMode.PinRow,
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
 * The toolbar's trailing group, shared by every preset here: "+ Add" and the column-visibility
 * toggle. `undefined` when the group would be empty. The sort builder and clear-filters are not
 * here on purpose — see {@link ToolbarControls}.
 */
export function useToolbarEnd(): ReactNode {
	const { create, visibility } = useToolbarControls()
	if (!create && !visibility) return undefined
	return (
		<>
			{create && <CreateTrigger />}
			{visibility && <VisibilityTrigger />}
		</>
	)
}
