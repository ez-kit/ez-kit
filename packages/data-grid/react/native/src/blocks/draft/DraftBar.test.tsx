import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilterChip } from '../filtering/FilterChip'

import { DraftBar } from './DraftBar'

import type { DraftBarProps } from '@ez-kit/data-grid-react'

function makeProps(overrides: Partial<DraftBarProps> = {}): DraftBarProps {
	return {
		open: true,
		pending: { sorting: 1, filters: 2, search: false },
		selectedCount: 3,
		variant: 'floating',
		onApply: vi.fn(),
		onReset: vi.fn(),
		...overrides,
	}
}

describe('DraftBar (native)', () => {
	it('renders the pending counts and both actions', () => {
		render(<DraftBar {...makeProps()} />)

		expect(screen.getByText(/3 selected/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
	})

	it('omits the selection chip when nothing is selected', () => {
		render(<DraftBar {...makeProps({ pending: { sorting: 1, filters: 0, search: false }, selectedCount: 0 })} />)

		expect(screen.queryByText(/selected/i)).toBeNull()
	})

	it('exposes the draft state on the toolbar root', () => {
		render(<DraftBar {...makeProps({ pending: { sorting: 1, filters: 2, search: true } })} />)

		const bar = screen.getByTestId('draft-bar')
		expect(bar).toHaveAttribute('role', 'toolbar')
		expect(bar).toHaveAttribute('data-slot', 'draft-bar')
		expect(bar).toHaveAttribute('data-pending-sorting', '1')
		expect(bar).toHaveAttribute('data-pending-filters', '2')
		expect(bar).toHaveAttribute('data-pending-search', 'true')
		expect(bar).toHaveAttribute('data-selected-count', '3')
	})

	it('renders the floating variant by default', () => {
		render(<DraftBar {...makeProps()} />)

		expect(screen.getByTestId('draft-bar')).toHaveAttribute('data-variant', 'floating')
	})

	it('passes the inline variant through', () => {
		render(<DraftBar {...makeProps({ variant: 'inline' })} />)

		expect(screen.getByTestId('draft-bar')).toHaveAttribute('data-variant', 'inline')
	})

	it('renders nothing when closed', () => {
		render(<DraftBar {...makeProps({ open: false })} />)

		expect(screen.queryByTestId('draft-bar')).toBeNull()
	})

	it('keeps the selection chip non-interactive', () => {
		render(<DraftBar {...makeProps()} />)

		// Exactly the two draft actions — the selection stands down to a plain chip.
		expect(screen.getAllByRole('button')).toHaveLength(2)
	})

	it('wires the actions to their handlers', () => {
		const onApply = vi.fn()
		const onReset = vi.fn()
		render(<DraftBar {...makeProps({ onApply, onReset })} />)

		fireEvent.click(screen.getByRole('button', { name: /apply/i }))
		fireEvent.click(screen.getByRole('button', { name: /reset/i }))

		expect(onApply).toHaveBeenCalledTimes(1)
		expect(onReset).toHaveBeenCalledTimes(1)
	})
})

describe('FilterChip draft mark (native)', () => {
	it('marks a drafted filter chip', () => {
		render(
			<FilterChip
				label='Status'
				value='active'
				kind='column'
				isDraft
				onRemove={vi.fn()}
			/>,
		)

		expect(screen.getByText('Status').closest('[data-slot="filter-chip"]')).toHaveAttribute('data-draft-filter', '')
	})

	it('leaves an applied filter chip unmarked', () => {
		render(
			<FilterChip
				label='Status'
				value='active'
				kind='column'
				isDraft={false}
				onRemove={vi.fn()}
			/>,
		)

		expect(screen.getByText('Status').closest('[data-slot="filter-chip"]')).not.toHaveAttribute('data-draft-filter')
	})
})
