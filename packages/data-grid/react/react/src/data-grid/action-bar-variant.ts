import { DEFAULT_ACTION_BAR_VARIANT, type ActionBarVariant } from '../use-data-grid'

import type { DataTable, GridFeatures } from '../types'

/**
 * Resolve the render mode of the shared action bar from `selection.bar`.
 *
 * The selection section and the pending-draft section are one bar with two contents, so both
 * must read the mode from this single place. A second config key for the draft bar would be a
 * knob that has to be kept equal to the first, which is a bug waiting to happen. Hence
 * {@link ActionBarVariant} rather than a selection-specific name: one type for the one bar both
 * sections render into.
 *
 * The mode says what the bar **looks like** — an in-flow strip against an overlay — and nothing
 * about where it renders. Layouts used to read it too, through a `GridShell` wrapper that placed
 * the bars for them; that was a config value deciding an element's position, so it went the way
 * of the eight placement options before it. A layout writes the bars where it wants them, and
 * one that asks for `inline` writes them above the table.
 */
export function resolveActionBarVariant<TRow extends object>(table: DataTable<GridFeatures, TRow>): ActionBarVariant {
	// Already settled by `useDataGrid`. The fallback covers the grid that renders the draft
	// section of the bar with no row selection at all, where there is no `selection.bar` to
	// have carried a mode.
	return table.grid.selection.bar?.variant ?? DEFAULT_ACTION_BAR_VARIANT
}
