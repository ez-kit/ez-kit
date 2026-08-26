import { useGridComponents } from '../components-context'
import {
	COLUMN_VISIBILITY_KEY,
	FILTERING_TOOLBAR_KEY,
	GLOBAL_FILTERING_KEY,
	PAGE_SIZER_KEY,
	SORTING_KEY,
} from '../use-data-grid'

import { ClearFiltersButton } from './clear-filters-button'
import { ColumnVisibilityTrigger } from './column-visibility-trigger'
import { CreateTrigger } from './create-trigger'
import { GlobalFilterInput } from './global-filter-input'
import { PageSizer } from './page-sizer'
import { SortTrigger } from './sort-trigger'
import { useDataGridInstance } from './table-context'

import type {
	ColumnVisibilityUIConfig,
	NormalizedFilteringToolbarConfig,
	NormalizedGlobalFilteringConfig,
	ReactSortingConfig,
} from '../use-data-grid'
import type { ReactNode } from 'react'

export type DataGridToolbarProps = {
	/**
	 * Replaces the toolbar contents wholesale — the kit's `left` / `right` slots are not
	 * used, so the whole bar is yours. Cannot be combined with `left` / `right`.
	 */
	children?: ReactNode
	/**
	 * Extra content for the toolbar's left slot, **appended after** the auto-mounted
	 * controls (the PageSizer).
	 *
	 * This is the additive escape hatch: `children` replaces everything, `left` / `right`
	 * keep the auto-mounted defaults and add to them, which is what "the default toolbar
	 * plus one button of mine" needs.
	 */
	left?: ReactNode
	/**
	 * Extra content for the toolbar's right slot, appended after the auto-mounted controls
	 * (global search, Clear filters, create trigger, sort builder, column visibility).
	 */
	right?: ReactNode
}

/**
 * Toolbar area above the table.
 *
 * With no props it renders the auto-mounted defaults:
 * - PageSizer on the left when `pagination.pageSizeOptions` is set
 * - global search / Clear filters / "+ Add" / sort builder / column visibility on the right,
 *   each gated by its own feature flag
 *
 * `left` / `right` append to those. `children` replaces them.
 */
export function Toolbar({ children, left: extraLeft, right: extraRight }: DataGridToolbarProps = {}) {
	const { Toolbar: ToolbarComponent } = useGridComponents().core
	// Toolbar reads only symbol-keyed UI configs and `table.options.*` (refs,
	// not state). No state subscription — editing / sorting / filtering
	// mutations do NOT re-render this component (sub-controls manage their
	// own narrow subscriptions).
	const instance = useDataGridInstance()
	const table = instance.table
	const hasCreating = Boolean(table.options.creating) && table.options.creating?.mode !== 'pin-row'

	const colVisConfig = (table as unknown as Record<symbol, unknown>)[COLUMN_VISIBILITY_KEY] as
		| boolean
		| ColumnVisibilityUIConfig
		| undefined
	const hasVisibilityToolbar =
		colVisConfig === true || (typeof colVisConfig === 'object' && Boolean(colVisConfig.toolbar))

	const sortConfig = (table as unknown as Record<symbol, unknown>)[SORTING_KEY] as
		| boolean
		| ReactSortingConfig
		| undefined
	const hasSortingToolbar = typeof sortConfig === 'object' && Boolean(sortConfig.toolbar)

	const pageSizeOptions = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as number[] | undefined

	const globalFilteringConfig = (table as unknown as Record<symbol, unknown>)[GLOBAL_FILTERING_KEY] as
		| NormalizedGlobalFilteringConfig
		| undefined
	const hasGlobalFilterToolbar = Boolean(globalFilteringConfig?.toolbar)

	const filteringToolbarConfig = (table as unknown as Record<symbol, unknown>)[FILTERING_TOOLBAR_KEY] as
		| NormalizedFilteringToolbarConfig
		| undefined
	const hasClearButtonToolbar = filteringToolbarConfig !== undefined

	if (children) {
		return <ToolbarComponent data-slot='toolbar'>{children}</ToolbarComponent>
	}

	const hasAutoLeft = Boolean(pageSizeOptions)
	const hasAutoRight =
		hasGlobalFilterToolbar || hasClearButtonToolbar || hasCreating || hasSortingToolbar || hasVisibilityToolbar

	const left =
		hasAutoLeft || extraLeft !== undefined ? (
			<>
				{hasAutoLeft && <PageSizer />}
				{extraLeft}
			</>
		) : null

	const right =
		hasAutoRight || extraRight !== undefined ? (
			<>
				{hasGlobalFilterToolbar && <GlobalFilterInput />}
				{hasClearButtonToolbar && <ClearFiltersButton />}
				{hasCreating && <CreateTrigger />}
				{hasSortingToolbar && <SortTrigger />}
				{hasVisibilityToolbar && <ColumnVisibilityTrigger />}
				{extraRight}
			</>
		) : null

	if (!left && !right) return null

	return (
		<ToolbarComponent
			data-slot='toolbar'
			left={left}
			right={right}
		/>
	)
}
