import { useGridComponents } from '../components-context'
import {
	COLUMN_VISIBILITY_KEY,
	FILTER_CLEAR_BUTTON_KEY,
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
	NormalizedClearButtonConfig,
	NormalizedGlobalFilteringConfig,
	PageSizerConfig,
} from '../use-data-grid'
import type { SortingConfig } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type ToolbarProps = {
	children?: ReactNode
}

/**
 * Toolbar area above the table.
 * Renders default content when no children are provided:
 * - PageSizer on the left when `pageSizer` is configured
 * - "+ Add" create trigger and column visibility toggle on the right
 */
export function Toolbar({ children }: ToolbarProps) {
	const { Toolbar: ToolbarComponent } = useGridComponents()
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

	const sortConfig = (table as unknown as Record<symbol, unknown>)[SORTING_KEY] as boolean | SortingConfig | undefined
	const hasSortingToolbar = typeof sortConfig === 'object' && Boolean(sortConfig.toolbar)

	const pageSizerConfig = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as PageSizerConfig | undefined

	const globalFilteringConfig = (table as unknown as Record<symbol, unknown>)[GLOBAL_FILTERING_KEY] as
		| NormalizedGlobalFilteringConfig
		| undefined
	const hasGlobalFilterToolbar = Boolean(globalFilteringConfig?.toolbar)

	const clearButtonConfig = (table as unknown as Record<symbol, unknown>)[FILTER_CLEAR_BUTTON_KEY] as
		| NormalizedClearButtonConfig
		| undefined
	const hasClearButtonToolbar = clearButtonConfig !== undefined

	if (children) {
		return <ToolbarComponent data-slot='toolbar'>{children}</ToolbarComponent>
	}

	const left = pageSizerConfig ? <PageSizer /> : null
	const right =
		hasGlobalFilterToolbar || hasClearButtonToolbar || hasCreating || hasSortingToolbar || hasVisibilityToolbar ? (
			<>
				{hasGlobalFilterToolbar && <GlobalFilterInput />}
				{hasClearButtonToolbar && <ClearFiltersButton />}
				{hasCreating && <CreateTrigger />}
				{hasSortingToolbar && <SortTrigger />}
				{hasVisibilityToolbar && <ColumnVisibilityTrigger />}
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
