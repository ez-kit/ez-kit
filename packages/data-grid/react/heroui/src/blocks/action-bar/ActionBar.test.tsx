import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilterChip } from '../filtering/FilterChip'

import { ActionBar } from './ActionBar'

import type { ActionBarProps, ActionBarSelectionSection } from '@ez-kit/data-grid-react'

function makeDraft(overrides: Partial<NonNullable<ActionBarProps['draft']>> = {}) {
	return {
		pending: { sorting: 1, columnFilters: 2, globalFilter: 0 },
		onApply: vi.fn(),
		onReset: vi.fn(),
		...overrides,
	}
}

function makeSelection(overrides: Partial<ActionBarSelectionSection> = {}): ActionBarSelectionSection {
	return {
		count: 3,
		selectedRows: [],
		onClear: vi.fn(),
		...overrides,
	}
}

function makeProps(overrides: Partial<ActionBarProps> = {}): ActionBarProps {
	return {
		open: true,
		variant: 'floating',
		draft: makeDraft(),
		...overrides,
	}
}

describe('ActionBar (heroui)', () => {
	it('renders the pending counts and both draft actions', () => {
		render(<ActionBar {...makeProps()} />)

		expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
	})

	it('renders one bar carrying both sections, divided by a separator', () => {
		const { container } = render(<ActionBar {...makeProps({ selection: makeSelection() })} />)

		expect(container.querySelectorAll('[data-slot="action-bar"]')).toHaveLength(1)

		const bar = screen.getByTestId('action-bar')
		expect(bar.querySelector('[data-slot="action-bar-selection"]')).not.toBeNull()
		expect(bar.querySelector('[data-slot="action-bar-draft"]')).not.toBeNull()
		// One between the two sections, plus the selection section's own before its controls.
		expect(bar.querySelectorAll('[data-slot="action-bar-separator"]').length).toBeGreaterThanOrEqual(1)
	})

	it('omits the selection section when nothing is selected', () => {
		const { container } = render(<ActionBar {...makeProps()} />)

		expect(container.querySelector('[data-slot="action-bar-selection"]')).toBeNull()
		expect(screen.queryByText(/selected/i)).toBeNull()
	})

	it('omits the draft section when the draft is clean', () => {
		const props = makeProps({ selection: makeSelection() })
		delete props.draft
		const { container } = render(<ActionBar {...props} />)

		expect(container.querySelector('[data-slot="action-bar-draft"]')).toBeNull()
		expect(container.querySelector('[data-slot="action-bar-selection"]')).not.toBeNull()
	})

	it('exposes the draft and selection state on the toolbar root', () => {
		render(
			<ActionBar
				{...makeProps({
					draft: makeDraft({ pending: { sorting: 1, columnFilters: 2, globalFilter: 1 } }),
					selection: makeSelection(),
				})}
			/>,
		)

		const bar = screen.getByTestId('action-bar')
		expect(bar).toHaveAttribute('role', 'toolbar')
		expect(bar).toHaveAttribute('data-slot', 'action-bar')
		expect(bar).toHaveAttribute('data-pending-sorting', '1')
		expect(bar).toHaveAttribute('data-pending-column-filters', '2')
		expect(bar).toHaveAttribute('data-pending-global-filter', '1')
		expect(bar).toHaveAttribute('data-selected-count', '3')
	})

	it('renders the floating chrome by default', () => {
		const { container } = render(<ActionBar {...makeProps()} />)

		expect(screen.getByTestId('action-bar')).toHaveAttribute('data-variant', 'floating')
		expect(container.querySelector('[data-slot="action-bar-anchor"]')).not.toBeNull()
	})

	it('renders in flow, without the floating anchor, under the inline variant', () => {
		const { container } = render(<ActionBar {...makeProps({ variant: 'inline', selection: makeSelection() })} />)

		expect(screen.getByTestId('action-bar')).toHaveAttribute('data-variant', 'inline')
		expect(container.querySelector('[data-slot="action-bar-anchor"]')).toBeNull()
		expect(container.querySelector('[data-slot="action-bar-draft"]')).not.toBeNull()
	})

	it('divides the inline strip by position rather than by a stranded rule', () => {
		// The strip is full width and pushes the two sections to its ends, so a section divider
		// would sit in the gap dividing nothing. The floating bar, which is `w-fit`, keeps it.
		const { container } = render(<ActionBar {...makeProps({ variant: 'inline', selection: makeSelection() })} />)

		expect(container.querySelectorAll('[data-slot="action-bar-separator"]')).toHaveLength(0)
	})

	it('renders nothing when closed', () => {
		render(<ActionBar {...makeProps({ open: false })} />)

		expect(screen.queryByTestId('action-bar')).toBeNull()
	})

	it('keeps the bulk actions live while a draft is pending', () => {
		const onDelete = vi.fn()
		render(<ActionBar {...makeProps({ selection: makeSelection({ onDelete }) })} />)

		const deleteButton = screen.getByRole('button', { name: /delete/i })
		expect(deleteButton).toBeEnabled()

		fireEvent.click(deleteButton)
		expect(onDelete).toHaveBeenCalledTimes(1)
	})

	it('wires the draft actions to their handlers', () => {
		const onApply = vi.fn()
		const onReset = vi.fn()
		render(<ActionBar {...makeProps({ draft: makeDraft({ onApply, onReset }) })} />)

		fireEvent.click(screen.getByRole('button', { name: /apply/i }))
		fireEvent.click(screen.getByRole('button', { name: /reset/i }))

		expect(onApply).toHaveBeenCalledTimes(1)
		expect(onReset).toHaveBeenCalledTimes(1)
	})

	it('clears the selection from the close button', () => {
		const onClear = vi.fn()
		render(<ActionBar {...makeProps({ selection: makeSelection({ onClear }) })} />)

		fireEvent.click(screen.getByRole('button', { name: /clear/i }))
		expect(onClear).toHaveBeenCalledTimes(1)
	})

	it('renders custom selection actions and the start / end slots', () => {
		const onAction = vi.fn()
		render(
			<ActionBar
				{...makeProps({
					selection: makeSelection({
						actions: [{ id: 'archive', label: 'Archive', onAction }],
						start: <span data-testid='bar-start'>start</span>,
						end: <span data-testid='bar-end'>end</span>,
					}),
				})}
			/>,
		)

		expect(screen.getByTestId('bar-start')).toBeInTheDocument()
		expect(screen.getByTestId('bar-end')).toBeInTheDocument()

		const action = screen.getByRole('button', { name: /archive/i })
		expect(action).toHaveAttribute('data-slot', 'action-bar-action')
		fireEvent.click(action)
		expect(onAction).toHaveBeenCalledTimes(1)
	})
})

describe('FilterChip draft mark (heroui)', () => {
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

		expect(screen.getByText('Status').closest('[data-chip-kind]')).toHaveAttribute('data-draft-filter', '')
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

		expect(screen.getByText('Status').closest('[data-chip-kind]')).not.toHaveAttribute('data-draft-filter')
	})
})
