import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VisibilityMenu } from './VisibilityMenu'

import type { VisibilityColumnItem } from '@ez-kit/data-grid-react'

function column(overrides: Partial<VisibilityColumnItem> = {}): VisibilityColumnItem {
	return { id: 'name', label: 'Name', isVisible: true, canHide: true, onToggle: vi.fn(), ...overrides }
}

function open(columns: VisibilityColumnItem[]) {
	render(<VisibilityMenu columns={columns} />)
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
