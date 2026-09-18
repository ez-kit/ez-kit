import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderGrid } from '../test-utils'

const ACTION_BAR = "[data-slot='action-bar']"
const SELECTION_SECTION = "[data-slot='action-bar-selection']"
const DRAFT_SECTION = "[data-slot='action-bar-draft']"

/**
 * The regression this change exists for.
 *
 * Two independent components each drew a whole bar, kept apart by a `return null` in
 * `SelectionBar` that only ran when `rowSelection` changed. A draft edit changes no
 * `rowSelection`, so the gate never re-ran and both bars mounted at the same sticky
 * position — measured on `/examples/shadcn/production-deferred-apply`.
 *
 * These cases name the *target* slots, so they fail on "0 elements found" rather than on the
 * overlap: they encode the destination, not the symptom.
 */
describe('<ActionBar> — one bar, two live sections', () => {
	it('renders exactly one bar carrying both sections when a draft is pending over a selection', async () => {
		const { container, table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			selection: true,
		})
		table.setRowSelection({ '1': true, '2': true })

		table.setSorting([{ id: 'age', desc: true }])

		await screen.findByTestId('action-bar')
		const bars = container.querySelectorAll(ACTION_BAR)
		expect(bars).toHaveLength(1)

		const bar = bars[0]
		expect(bar?.querySelector(SELECTION_SECTION)).not.toBeNull()
		expect(bar?.querySelector(DRAFT_SECTION)).not.toBeNull()
	})

	/**
	 * The behaviour change, not just the DOM change. The selection is valid against the
	 * **applied** query — the one the user is looking at — so bulk actions stay live while a
	 * draft is pending. The set only goes stale after Apply, and `table.draft.apply()` already
	 * clears the selection in the same state change.
	 */
	it('keeps the bulk Delete live while the draft is pending', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			selection: true,
			deleting: { onDelete: () => {}, bulk: { onDelete } },
		})
		table.setRowSelection({ '1': true, '2': true })

		table.setSorting([{ id: 'age', desc: true }])

		const deleteButton = await screen.findByRole('button', { name: /delete/i })
		expect(deleteButton).toBeEnabled()

		await user.click(deleteButton)
		expect(onDelete).toHaveBeenCalledOnce()
	})
})
