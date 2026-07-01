import { useGridComponents } from '../components-context'
import { FILTER_CLEAR_BUTTON_KEY } from '../use-data-grid'

import { useTable } from './table-context'

import type { NormalizedClearButtonConfig } from '../use-data-grid'
import type { ReactNode } from 'react'

type ClearFiltersButtonProps = {
	/** Optional custom content. When omitted the kit renders its default (icon-only). */
	children?: ReactNode
	/**
	 * Override the default hidden-when-empty behaviour. If omitted, falls back
	 * to the value normalized from `filtering.clearButton` on the table config.
	 */
	alwaysShow?: boolean
	/** Accessibility label. Defaults to "Clear filters" when omitted. */
	ariaLabel?: string
}

/**
 * Compound member: button that clears every active column filter AND the global filter.
 *
 * Hidden by default when no filter is active. Pass `alwaysShow={true}` (or set
 * `filtering: { clearButton: { alwaysShow: true } }` on the table config) to keep
 * it visible in a disabled state.
 *
 * Auto-mounted by `<Toolbar>` into `Toolbar.right` after `<GlobalFilterInput>`
 * when `filtering.clearButton` is truthy. Can also be placed manually via
 * `<DataGrid.ClearFiltersButton />`.
 *
 * The visual is owned by the UI kit via the `ClearFiltersButton` DI slot; the
 * default rendering is icon-only.
 */
export function ClearFiltersButton({ children, alwaysShow: alwaysShowProp, ariaLabel }: ClearFiltersButtonProps = {}) {
	const table = useTable()
	const { ClearFiltersButton: Component } = useGridComponents()

	const cfg = (table as unknown as Record<symbol, unknown>)[FILTER_CLEAR_BUTTON_KEY] as
		| NormalizedClearButtonConfig
		| undefined

	const alwaysShow = alwaysShowProp ?? cfg?.alwaysShow ?? false
	const hasColumnFilters = table.getState().columnFilters.length > 0
	const hasGlobalFilter = Boolean(table.getState().globalFilter)
	const hasAnyFilter = hasColumnFilters || hasGlobalFilter

	if (!hasAnyFilter && !alwaysShow) return null

	return (
		<Component
			disabled={!hasAnyFilter}
			onPress={() => {
				table.resetColumnFilters()
				table.setGlobalFilter(undefined)
			}}
			{...(children !== undefined
				? { children, ...(ariaLabel !== undefined ? { ariaLabel } : {}) }
				: { ariaLabel: ariaLabel ?? 'Clear filters' })}
		/>
	)
}
