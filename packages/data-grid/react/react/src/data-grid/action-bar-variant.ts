import { DEFAULT_ACTION_BAR_VARIANT, type ActionBarVariant } from '../use-data-grid'

import type { Table } from '@tanstack/table-core'

/**
 * Resolve the render mode of the shared action bar from `selection.bar`.
 *
 * The selection section and the pending-draft section are one bar with two contents, so both
 * must read the mode from this single place — and so must the layout that positions it. A
 * second config key for the draft bar would be a knob that has to be kept equal to the first,
 * which is a bug waiting to happen. Hence {@link ActionBarVariant} rather than a
 * selection-specific name: one type for the one bar both sections render into.
 */
export function resolveActionBarVariant(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>,
): ActionBarVariant {
	// Already settled by `useDataGrid`. The fallback covers the grid that renders the draft
	// section of the bar with no row selection at all, where there is no `selection.bar` to
	// have carried a mode.
	return table.grid.selection.bar?.variant ?? DEFAULT_ACTION_BAR_VARIANT
}
