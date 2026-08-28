import { useGridComponents } from '../components-context'

import { useDataGridState, useDataGridTable } from './table-context'

import type { ReactNode } from 'react'

export type DataGridClearFiltersButtonProps = {
	/** Optional custom content. When omitted the kit renders its default (icon-only). */
	children?: ReactNode
	/**
	 * Override the default hidden-when-empty behaviour. If omitted, falls back
	 * to the value normalized from `filtering.toolbar` on the table config.
	 */
	alwaysShow?: boolean
	/** Accessibility label. Defaults to "Clear filters" when omitted. */
	'aria-label'?: string
}

/**
 * Compound member: button that clears every active column filter AND the global filter.
 *
 * Hidden by default when no filter is active. Pass `alwaysShow={true}` (or set
 * `filtering: { toolbar: { alwaysShow: true } }` on the table config) to keep
 * it visible in a disabled state.
 *
 * Auto-mounted by `<Toolbar>` into `Toolbar.right` after `<GlobalFilterInput>`
 * when `filtering.toolbar` is truthy. Can also be placed manually via
 * `<DataGrid.ClearFiltersButton />`.
 *
 * The visual is owned by the UI kit via the `ClearFiltersButton` DI slot; the
 * default rendering is icon-only.
 */
export function ClearFiltersButton({
	children,
	alwaysShow: alwaysShowProp,
	'aria-label': ariaLabel,
}: DataGridClearFiltersButtonProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnFilters)
	useDataGridState((s) => s.globalFilter as unknown)
	const { ClearFiltersButton: Component } = useGridComponents().filtering

	const cfg = table.grid.filtering.toolbar

	const alwaysShow = alwaysShowProp ?? cfg?.alwaysShow ?? false
	const hasColumnFilters = table.getState().columnFilters.length > 0
	const hasGlobalFilter = Boolean(table.getState().globalFilter)
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
				: { 'aria-label': ariaLabel ?? 'Clear filters' })}
		/>
	)
}
