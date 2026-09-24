import { useGridComponents } from '../components-context'

import { useDataGridState, useDataGridTable } from './table-context'

import type { ReactNode } from 'react'

export type DataGridClearFiltersButtonProps = {
	/** Optional custom content. When omitted the kit renders its default (icon-only). */
	children?: ReactNode
	/**
	 * Keep the button visible, disabled, while no filter is active. Default: `false` — with
	 * nothing to clear it renders nothing at all, so a toolbar does not carry a dead control.
	 *
	 * A prop rather than the `filtering.toolbar.alwaysShow` option it replaced: whether the
	 * button is mounted is now the layout's decision, and this is behaviour of the one button
	 * the layout mounted, not of the grid.
	 */
	alwaysShow?: boolean
	/** Accessibility label. Defaults to "Clear filters" when omitted. */
	'aria-label'?: string
}

/**
 * Compound member: button that clears every active column filter AND the global filter.
 *
 * Renders nothing while no filter is active, unless `alwaysShow`. Place it wherever a layout
 * wants it — usually `Toolbar.end`, after the search box.
 *
 * The visual is owned by the UI kit via the `ClearFilterButton` DI slot; the
 * default rendering is icon-only.
 */
export function ClearFiltersButton({
	children,
	alwaysShow = false,
	'aria-label': ariaLabel,
}: DataGridClearFiltersButtonProps = {}) {
	const table = useDataGridTable()
	// The subscription is the read — see `active-filters-bar.tsx` for the note.
	const columnFilters = useDataGridState((s) => s.columnFilters)
	const globalFilter = useDataGridState((s) => s.globalFilter as unknown)
	const { ClearFilterButton: Component } = useGridComponents().filtering

	const hasColumnFilters = columnFilters.length > 0
	const hasGlobalFilter = Boolean(globalFilter)
	const hasAnyFilter = hasColumnFilters || hasGlobalFilter

	if (!hasAnyFilter && !alwaysShow) return null

	return (
		<Component
			disabled={!hasAnyFilter}
			onClick={() => {
				table.resetColumnFilters()
				table.setGlobalFilter(undefined)
			}}
			{...(children !== undefined
				? { children, ...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {}) }
				: { 'aria-label': ariaLabel ?? table.grid.messages.filtering.clearAll })}
		/>
	)
}
