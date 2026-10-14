import { DEFAULT_ACTION_BAR_VARIANT, type ActionBarVariant } from '../use-data-grid'

import type { DataTable, GridFeatures } from '../types'

/**
 * Resolve the render mode of the shared action bar from `selection.bar`.
 *
 * The selection section and the pending-draft section are one bar with two live contents, so
 * there is one mode and one place to read it from. A second config key for the draft would be a
 * knob that has to be kept equal to the first, which is a bug waiting to happen — and while the
 * two sections were two components, keeping a knob equal was the least of what they had to keep
 * in step. Hence {@link ActionBarVariant} rather than a selection-specific name: one type for
 * the one bar both sections render into.
 *
 * The mode says what the bar **looks like** — an in-flow strip against an overlay. The shipped
 * presets also read it to put the bar where that kind of bar belongs: an in-flow strip above the
 * table, an overlay last (`useActionBarSlots`, internal to `../layouts`). That is a preset rendering an
 * enabled feature correctly, not a placement option. A layout of one's own puts the bar wherever
 * it writes it, whatever the mode.
 */
export function resolveActionBarVariant<TRow extends object>(table: DataTable<GridFeatures, TRow>): ActionBarVariant {
	// Already settled by `useDataGrid`. The fallback covers the grid that renders the draft
	// section of the bar with no row selection at all, where there is no `selection.bar` to
	// have carried a mode.
	return table.grid.selection.bar?.variant ?? DEFAULT_ACTION_BAR_VARIANT
}
