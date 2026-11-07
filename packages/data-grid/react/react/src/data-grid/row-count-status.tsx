'use client'

import { hasTrustedRowTotal, rowTotalOf } from './aria-state'
import { useDataGridState, useDataGridTable } from './table-context'
import { VisuallyHiddenStatus } from './visually-hidden'

/**
 * The one live region the grid has: how many rows the current query matches.
 *
 * A filter, a search term or a cleared chip changes the table under a screen-reader user with no
 * announcement at all — the rows simply become different rows, and nothing says how many are
 * left. `role="status"` (`aria-live="polite"`) is what turns that into a sentence, and it is
 * deliberately the *only* thing announced: a region that narrated sorting and pagination as well
 * would talk over the control the user is still operating.
 *
 * Mounted by the root rather than by a layout, because it is not a placement decision — there is
 * nothing to place. It renders no visible box in any arrangement, and a grid that composed its
 * own layout must not lose it by not knowing about it.
 *
 * Nothing is announced on mount: a live region's initial content is not an update. The first
 * announcement is the first query change, which is exactly the event worth hearing.
 */
export function RowCountStatus() {
	const table = useDataGridTable()

	// Observe the displayed count, including the applied row model under draft mode. A sorting,
	// selection or editing update that keeps the count unchanged must not render this live region.
	// Manual pagination without a trusted total stays silent rather than announcing the page size.
	const total = useDataGridState(() =>
		hasTrustedRowTotal(table) ? (rowTotalOf(table) ?? table.getRowModel().rows.length) : undefined,
	)
	if (total === undefined) return null

	return <VisuallyHiddenStatus>{table.grid.messages.grid.rowCount({ count: total })}</VisuallyHiddenStatus>
}
