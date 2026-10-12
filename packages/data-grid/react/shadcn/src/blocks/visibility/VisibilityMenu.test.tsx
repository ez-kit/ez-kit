import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VisibilityMenu } from './VisibilityMenu'

import type { VisibilityColumnItem } from '@ez-kit/data-grid-react'

function column(overrides: Partial<VisibilityColumnItem> = {}): VisibilityColumnItem {
	return { id: 'name', label: 'Name', isVisible: true, canHide: true, onToggle: vi.fn(), ...overrides }
}

/**
 * `isColumnPanel` defaults to whether the items carry moves, which is what the panel's shape used
 * to be read off. It is a *test* convenience only — the real value comes from
 * `ordering.column.visibilityMenu`, and `panel: true` names a drag-only panel, whose items carry
 * none.
 */
function open(columns: VisibilityColumnItem[], panel = columns.some((col) => col.ordering !== undefined)) {
	render(
		<VisibilityMenu
			columns={columns}
			isColumnPanel={panel}
		/>,
	)
	fireEvent.click(screen.getByRole('button', { name: /columns/i }))
}

describe('VisibilityMenu (shadcn)', () => {
	it('toggles a column from its checkbox', () => {
		const onToggle = vi.fn()
		open([column({ onToggle })])

		fireEvent.click(screen.getByRole('checkbox', { name: 'Name' }))

		expect(onToggle).toHaveBeenCalledTimes(1)
	})

	it('offers no move controls until a column carries them', () => {
		open([column()])

		expect(screen.queryByRole('button', { name: /move/i })).toBeNull()
	})

	/**
	 * The **drag-only** panel — `visibilityMenu: true` with an adapter bound. Its items carry no
	 * `ordering`, so nothing in the list says "panel"; the row is the shared
	 * `<DataGridVisibilityItem>` either way here, and what the panel owes it is the wider popover,
	 * since a grip takes room the arrows used to.
	 */
	it('stays a panel, wider and arrow-free, when the rows drag instead', () => {
		open([column()], true)

		expect(screen.queryByRole('button', { name: /move/i })).toBeNull()
		expect(document.querySelector('[data-slot="column-visibility-item"]')).not.toBeNull()
		expect(document.querySelector('.w-60')).not.toBeNull()
	})

	it('disables the toggle of a column that can never be hidden, and lists it anyway', () => {
		open([column({ canHide: false })])

		expect(screen.getByRole('checkbox', { name: 'Name' })).toBeDisabled()
	})

	/**
	 * The buttons sit outside the `<label>`, which is the whole reason the row is a flex box and
	 * not one big label: a button inside a label toggles it on the way to being pressed.
	 */
	it('moves a column without toggling it', () => {
		const onToggle = vi.fn()
		const onMoveEnd = vi.fn()
		open([
			column({
				onToggle,
				ordering: { canMoveStart: false, canMoveEnd: true, onMoveStart: vi.fn(), onMoveEnd },
			}),
		])

		expect(screen.getByRole('button', { name: /move up/i })).toBeDisabled()
		fireEvent.click(screen.getByRole('button', { name: /move down/i }))

		expect(onMoveEnd).toHaveBeenCalledTimes(1)
		expect(onToggle).not.toHaveBeenCalled()
	})
})
