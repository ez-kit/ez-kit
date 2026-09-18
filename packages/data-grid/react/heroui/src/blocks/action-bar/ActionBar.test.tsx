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

/**
 * The separators that divide the two **sections**, i.e. the ones that belong to no section. The
 * selection section draws rules of its own (before its controls, and before the ×), so a bare
 * count over the whole bar cannot tell the two apart.
 */
function betweenSectionRules(container: HTMLElement): Element[] {
	return Array.from(container.querySelectorAll('[data-slot="action-bar-separator"]')).filter(
		(node) =>
			node.closest('[data-slot="action-bar-selection"]') === null &&
			node.closest('[data-slot="action-bar-draft"]') === null,
	)
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

	it('omits the selection section when nothing is selected beside a pending draft', () => {
		const { container } = render(<ActionBar {...makeProps({ selection: makeSelection({ count: 0 }) })} />)

		expect(container.querySelector('[data-slot="action-bar-selection"]')).toBeNull()
		expect(container.querySelector('[data-slot="action-bar-draft"]')).not.toBeNull()
	})

	it('keeps a zero count when there is no draft to stand beside it', () => {
		// The count is the chrome the floating bar animates out with, so on its own it stays.
		const props = makeProps({ selection: makeSelection({ count: 0 }) })
		delete props.draft
		const { container } = render(<ActionBar {...props} />)

		expect(container.querySelector('[data-slot="action-bar-selection"]')).not.toBeNull()
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
		// The strip is full width and pushes the two sections to its ends, so a rule *between*
		// them would sit in the gap dividing nothing. The floating bar, which is `w-fit`, keeps
		// it. The selection section is given actions so that it draws rules of its own — the
		// claim is about the rule between the sections, not about there being no rules at all.
		const selection = makeSelection({ onDelete: vi.fn() })

		const inline = render(<ActionBar {...makeProps({ variant: 'inline', selection })} />)
		expect(inline.container.querySelectorAll('[data-slot="action-bar-separator"]').length).toBeGreaterThan(0)
		expect(betweenSectionRules(inline.container)).toHaveLength(0)
		inline.unmount()

		const floating = render(<ActionBar {...makeProps({ selection })} />)
		expect(betweenSectionRules(floating.container)).toHaveLength(1)
	})

	it('divides the count from the close button whether or not there are actions', () => {
		const bare = render(<ActionBar {...makeProps({ selection: makeSelection() })} />)
		const bareSection = bare.container.querySelector('[data-slot="action-bar-selection"]')
		expect(bareSection?.querySelectorAll('[data-slot="action-bar-separator"]')).toHaveLength(1)
		bare.unmount()

		const withActions = render(<ActionBar {...makeProps({ selection: makeSelection({ onDelete: vi.fn() }) })} />)
		const section = withActions.container.querySelector('[data-slot="action-bar-selection"]')
		expect(section?.querySelectorAll('[data-slot="action-bar-separator"]')).toHaveLength(2)
	})

	it('names the draft section rather than the whole toolbar', () => {
		render(<ActionBar {...makeProps({ selection: makeSelection() })} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar).not.toHaveAttribute('aria-label')

		// `role='group'` is what makes the name reach assistive technology at all.
		const draft = bar.querySelector('[data-slot="action-bar-draft"]')
		expect(draft).toHaveAttribute('role', 'group')
		expect(draft).toHaveAttribute('aria-label', 'Pending changes')
	})

	it('discards the draft on Escape when the selection is empty', () => {
		// The bar branches on what there is to clear, not on which sections it was handed: a
		// `selection` section exists because `selection.bar` is configured, at any count.
		const onClear = vi.fn()
		const onReset = vi.fn()
		render(
			<ActionBar
				{...makeProps({
					selection: makeSelection({ count: 0, onClear }),
					draft: makeDraft({ onReset }),
				})}
			/>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onClear).not.toHaveBeenCalled()
		expect(onReset).toHaveBeenCalledTimes(1)
	})

	it('clears the selection on Escape when rows are picked, leaving the draft standing', () => {
		const onClear = vi.fn()
		const onReset = vi.fn()
		render(
			<ActionBar
				{...makeProps({
					selection: makeSelection({ onClear }),
					draft: makeDraft({ onReset }),
				})}
			/>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onClear).toHaveBeenCalledTimes(1)
		expect(onReset).not.toHaveBeenCalled()
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
