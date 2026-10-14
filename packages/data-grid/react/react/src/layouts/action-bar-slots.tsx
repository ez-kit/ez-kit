import { ActionBar } from '../data-grid/action-bar'
import { resolveActionBarVariant } from '../data-grid/action-bar-variant'
import { useDataGridTable } from '../data-grid/table-context'
import { ActionBarVariant } from '../types'

import type { DataTable, GridFeatures } from '../types'
import type { ReactNode } from 'react'

/**
 * The preset's two places for the action bar: `top`, between the toolbar and the table, and
 * `bottom`, after everything else. Exactly one of them holds the bar; the other is `null`.
 */
type ActionBarSlots = {
	top: ReactNode
	bottom: ReactNode
}

/**
 * Where a preset renders the action bar, decided by the bar's own variant.
 *
 * `inline` is a strip in the document flow, so it goes above the table, beside the rows it acts
 * on — below the pagination it would be out of sight of them. `floating` overlays the rows: both
 * kits position it out of a zero-height sticky anchor that has to follow those rows, and coming
 * last keeps it out of the tab order until there is something to act on. So it stays last.
 *
 * This is not the placement option the presets removed. Those were options that existed only to
 * say where something goes. The variant already says what the bar *is*, and a preset that renders
 * an enabled feature correctly puts it where that kind of bar belongs. A layout of one's own still
 * decides for itself.
 *
 * **Two slots rather than a flag**, so "exactly one bar" holds here instead of in four files:
 * only this hook creates the element. **Rather than a wrapper** (a `GridShell` once did this), so
 * each preset's JSX still states its own order and shows where the bar can land.
 *
 * The bar carries a stable `key`, and a preset renders both slots as children of **one**
 * fragment, so when the variant flips React moves the element instead of remounting it. Put the
 * two slots under different parents and that stops being true.
 *
 * Reads config, not state, so it does not subscribe — same as `useToolbarControls`. It still sees
 * a new variant: `useDataGrid` rebuilds `table.grid` on every render and hands the table to
 * context afresh, so every `useDataGridTable()` reader re-renders with it.
 */
export function useActionBarSlots(): ActionBarSlots {
	const table: DataTable<GridFeatures, never> = useDataGridTable()
	const bar = <ActionBar key='action-bar' />

	return resolveActionBarVariant(table) === ActionBarVariant.Inline
		? { top: bar, bottom: null }
		: { top: null, bottom: bar }
}
