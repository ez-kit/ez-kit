import { CreatingMode } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'

import { ClearFiltersButton } from './clear-filters-button'
import { CreateTrigger } from './create-trigger'
import { GlobalFilterInput } from './global-filter-input'
import { PageSizer } from './page-sizer'
import { SortMenuTrigger } from './sort-menu-trigger'
import { useDataGridTable } from './table-context'
import { VisibilityTrigger } from './visibility-trigger'

import type { ReactNode } from 'react'

export type DataGridToolbarProps = {
	/**
	 * Replaces the toolbar contents wholesale — the kit's `start` / `end` slots are not
	 * used, so the whole bar is yours. Cannot be combined with `start` / `end`.
	 */
	children?: ReactNode
	/**
	 * Extra content for the toolbar's leading slot, **appended after** the auto-mounted
	 * controls (the PageSizer).
	 *
	 * This is the additive escape hatch: `children` replaces everything, `start` / `end`
	 * keep the auto-mounted defaults and add to them, which is what "the default toolbar
	 * plus one button of mine" needs.
	 *
	 * `start` / `end`, not `left` / `right`: the toolbar is a flex row, so its two slots swap
	 * sides under RTL. Same logical vocabulary, for the same reason, as a column's `align`.
	 * Column *pinning* keeps `left` / `right` — a pinned column sticks to a viewport edge,
	 * which does not flip.
	 */
	start?: ReactNode
	/**
	 * Extra content for the toolbar's trailing slot, appended after the auto-mounted controls
	 * (global search, Clear filters, create trigger, sort builder, column visibility).
	 */
	end?: ReactNode
}

/**
 * Toolbar area above the table.
 *
 * With no props it renders the auto-mounted defaults:
 * - PageSizer in the leading slot when `pagination.toolbar` resolves on (which it does by
 *   default as soon as `pagination.items` is set)
 * - global search / Clear filters / "+ Add" / sort builder / column visibility in the trailing
 *   slot, each gated by its own feature flag
 *
 * `start` / `end` append to those. `children` replaces them.
 */
export function Toolbar({ children, start: extraStart, end: extraEnd }: DataGridToolbarProps = {}) {
	const { Toolbar: ToolbarComponent } = useGridComponents().core
	// Toolbar reads only symbol-keyed UI configs and `table.options.*` (refs,
	// not state). No state subscription — editing / sorting / filtering
	// mutations do NOT re-render this component (sub-controls manage their
	// own narrow subscriptions).
	const table = useDataGridTable()
	const hasCreating = Boolean(table.options.creating) && table.options.creating?.mode !== CreatingMode.PinRow

	const grid = table.grid

	const hasVisibilityToolbar = Boolean(grid.visibility?.toolbar)
	const hasSortingToolbar = Boolean(grid.sorting?.toolbar)

	const hasPageSizerToolbar = grid.pagination.pageSizer
	const hasGlobalFilterToolbar = Boolean(grid.globalFiltering?.toolbar)
	const hasClearButtonToolbar = grid.filtering.toolbar !== undefined

	if (children) {
		return <ToolbarComponent data-slot='toolbar'>{children}</ToolbarComponent>
	}

	const hasAutoStart = hasPageSizerToolbar
	const hasAutoEnd =
		hasGlobalFilterToolbar || hasClearButtonToolbar || hasCreating || hasSortingToolbar || hasVisibilityToolbar

	const start =
		hasAutoStart || extraStart !== undefined ? (
			<>
				{hasAutoStart && <PageSizer />}
				{extraStart}
			</>
		) : null

	const end =
		hasAutoEnd || extraEnd !== undefined ? (
			<>
				{hasGlobalFilterToolbar && <GlobalFilterInput />}
				{hasClearButtonToolbar && <ClearFiltersButton />}
				{hasCreating && <CreateTrigger />}
				{hasSortingToolbar && <SortMenuTrigger />}
				{hasVisibilityToolbar && <VisibilityTrigger />}
				{extraEnd}
			</>
		) : null

	if (!start && !end) return null

	return (
		<ToolbarComponent
			data-slot='toolbar'
			start={start}
			end={end}
		/>
	)
}
