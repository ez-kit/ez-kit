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

	// A whole-state subscription, for the reason `ActionBar` has one: the count follows the
	// **applied** query, which is `columnFilters` and `globalFilter` under a plain grid and the
	// draft's applied snapshot under a deferred one — and a selector stitching those together
	// would return a fresh object every time, which is the infinite-loop case the store contract
	// forbids. The cost is a re-render of one `<span>` on every state change; announcing nothing
	// is free, because an unchanged string is not an update a live region reports.
	useDataGridState((s) => s)

	// A manual grid that was given no `rowCount` does not know the total, and a number invented
	// from the page in the DOM would be worse than silence. A grid with no pagination feature at
	// all has no `getRowCount` at all, which is what `rowTotalOf` keeps from being a crash.
	const total = hasTrustedRowTotal(table) ? (rowTotalOf(table) ?? table.getRowModel().rows.length) : undefined
	if (total === undefined) return null

	return <VisuallyHiddenStatus>{table.grid.messages.grid.rowCount({ count: total })}</VisuallyHiddenStatus>
}
