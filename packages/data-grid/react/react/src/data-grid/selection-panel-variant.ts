import { DEFAULT_SELECTION_PANEL_VARIANT, type SelectionPanelVariant } from '../use-data-grid'

import type { Table } from '@tanstack/table-core'

/**
 * Resolve the render mode of the shared action bar from `selection.panel`.
 *
 * The selection section and the pending-draft section are one bar with two contents, so both
 * must read the mode from this single place — and so must the layout that positions it. A
 * second config key for the draft bar would be a knob that has to be kept equal to the first,
 * which is a bug waiting to happen.
 */
export function resolveSelectionPanelVariant(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>,
): SelectionPanelVariant {
	const rawConfig = table.grid.selection.panel

	const variant = typeof rawConfig === 'object' ? rawConfig.variant : undefined
	return variant ?? DEFAULT_SELECTION_PANEL_VARIANT
}
