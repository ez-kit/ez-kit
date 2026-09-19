import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilterChip } from '../filtering/FilterChip'

import { ActionBar } from './ActionBar'

import type { ActionBarDraftSection, ActionBarProps, ActionBarSelectionSection } from '@ez-kit/data-grid-react'

function makeDraft(overrides: Partial<ActionBarDraftSection> = {}): ActionBarDraftSection {
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
 * `| undefined` per key rather than `Partial<…>`: under `exactOptionalPropertyTypes` a case that
 * drops a section has to pass `draft: undefined` explicitly, which `Partial` rejects.
 */
type ActionBarPropsOverrides = Partial<Pick<ActionBarProps, 'open' | 'variant'>> & {
	selection?: ActionBarSelectionSection | undefined
	draft?: ActionBarDraftSection | undefined
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

function makeProps(overrides: ActionBarPropsOverrides = {}): ActionBarProps {
	const selection = 'selection' in overrides ? overrides.selection : makeSelection()
	const draft = 'draft' in overrides ? overrides.draft : makeDraft()

	return {
		open: overrides.open ?? true,
		variant: overrides.variant ?? 'floating',
		...(selection !== undefined ? { selection } : {}),
		...(draft !== undefined ? { draft } : {}),
	}
}

describe('ActionBar (shadcn)', () => {
	it('renders both sections on one surface, divided by a separator', () => {
		const { container } = render(<ActionBar {...makeProps()} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar.querySelectorAll('[data-slot="action-bar-selection"]')).toHaveLength(1)
		expect(bar.querySelectorAll('[data-slot="action-bar-draft"]')).toHaveLength(1)
		// The rule *between* the two, not the ones the selection section draws inside itself.
		expect(betweenSectionRules(container)).toHaveLength(1)
	})

	it('divides the count from the close button whether or not there are actions', () => {
		const bare = render(<ActionBar {...makeProps({ draft: undefined })} />)
		const bareSection = bare.container.querySelector('[data-slot="action-bar-selection"]')
		expect(bareSection?.querySelectorAll('[data-slot="action-bar-separator"]')).toHaveLength(1)
		bare.unmount()

		const withActions = render(
			<ActionBar {...makeProps({ draft: undefined, selection: makeSelection({ onDelete: vi.fn() }) })} />,
		)
		const section = withActions.container.querySelector('[data-slot="action-bar-selection"]')
		expect(section?.querySelectorAll('[data-slot="action-bar-separator"]')).toHaveLength(2)
	})

	it('names the draft section rather than the whole toolbar', () => {
		render(<ActionBar {...makeProps()} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar).not.toHaveAttribute('aria-label')

		// `role='group'` is what makes the name reach assistive technology at all.
		const draft = bar.querySelector('[data-slot="action-bar-draft"]')
		expect(draft).toHaveAttribute('role', 'group')
		expect(draft).toHaveAttribute('aria-label', 'Pending changes')
	})

	it('renders the pending counts and both draft actions', () => {
		render(<ActionBar {...makeProps()} />)

		expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
		expect(screen.getAllByText('3')).not.toHaveLength(0)
	})

	it('omits the selection section when nothing is selected beside a pending draft', () => {
		render(<ActionBar {...makeProps({ selection: makeSelection({ count: 0 }) })} />)

		expect(screen.queryByTestId('action-bar')?.querySelector('[data-slot="action-bar-selection"]')).toBeNull()
		expect(screen.queryByTestId('action-bar')?.querySelector('[data-slot="action-bar-draft"]')).not.toBeNull()
	})

	it('exposes the whole bar state on the one toolbar root', () => {
		render(
			<ActionBar
				{...makeProps({ draft: makeDraft({ pending: { sorting: 1, columnFilters: 2, globalFilter: 1 } }) })}
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
		const { container } = render(<ActionBar {...makeProps({ variant: 'inline' })} />)

		expect(screen.getByTestId('action-bar')).toHaveAttribute('data-variant', 'inline')
		expect(container.querySelector('[data-slot="action-bar-anchor"]')).toBeNull()
	})

	it('unmounts the inline strip when closed', () => {
		render(<ActionBar {...makeProps({ variant: 'inline', open: false, draft: undefined })} />)

		expect(screen.queryByTestId('action-bar')).toBeNull()
	})

	it('keeps the floating bar mounted while closing, so it can animate out', () => {
		render(<ActionBar {...makeProps({ open: false, draft: undefined, selection: makeSelection({ count: 0 }) })} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar).toHaveAttribute('data-state', 'closed')
		expect(bar).toHaveAttribute('data-selected-count', '0')
	})

	it('renders the selection section alone when there is no draft', () => {
		render(<ActionBar {...makeProps({ draft: undefined })} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar.querySelector('[data-slot="action-bar-selection"]')).not.toBeNull()
		expect(bar.querySelector('[data-slot="action-bar-draft"]')).toBeNull()
	})

	it('renders the draft section alone when there is no selection', () => {
		render(<ActionBar {...makeProps({ selection: undefined })} />)

		const bar = screen.getByTestId('action-bar')
		expect(bar.querySelector('[data-slot="action-bar-selection"]')).toBeNull()
		expect(bar.querySelector('[data-slot="action-bar-draft"]')).not.toBeNull()
	})

	it('keeps the bulk actions live while a draft is pending', () => {
		const onDelete = vi.fn()
		render(<ActionBar {...makeProps({ selection: makeSelection({ onDelete }) })} />)

		const deleteButton = screen.getByRole('button', { name: /delete/i })
		expect(deleteButton).toBeEnabled()

		fireEvent.click(deleteButton)
		expect(onDelete).toHaveBeenCalledTimes(1)
	})

	it('renders the configured bulk actions as buttons', () => {
		const onAction = vi.fn()
		render(
			<ActionBar
				{...makeProps({
					selection: makeSelection({
						actions: [{ id: 'archive', label: 'Archive', onAction }],
					}),
				})}
			/>,
		)

		const action = screen.getByRole('button', { name: 'Archive' })
		expect(action).toHaveAttribute('data-slot', 'action-bar-action')

		fireEvent.click(action)
		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('places `start` before the built-in Delete and `end` after the custom actions', () => {
		render(
			<ActionBar
				{...makeProps({
					selection: makeSelection({
						onDelete: vi.fn(),
						start: <span data-testid='slot-start' />,
						end: <span data-testid='slot-end' />,
					}),
				})}
			/>,
		)

		const section = screen.getByTestId('action-bar').querySelector('[data-slot="action-bar-selection"]')
		const children = Array.from(section?.children ?? [])
		const startIndex = children.findIndex((node) => node.matches('[data-testid="slot-start"]'))
		const endIndex = children.findIndex((node) => node.matches('[data-testid="slot-end"]'))
		const deleteIndex = children.findIndex((node) => /delete/i.test(node.textContent))

		expect(startIndex).toBeGreaterThanOrEqual(0)
		expect(startIndex).toBeLessThan(deleteIndex)
		expect(endIndex).toBeGreaterThan(deleteIndex)
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

	it('wires the close control to the clear handler', () => {
		const onClear = vi.fn()
		render(<ActionBar {...makeProps({ selection: makeSelection({ onClear }) })} />)

		const close = screen.getByTestId('action-bar').querySelector('[data-slot="action-bar-close"]')
		expect(close).not.toBeNull()
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- asserted above
		fireEvent.click(close!)
		expect(onClear).toHaveBeenCalledTimes(1)
	})

	/*
	 * The heroui kit has the same assertion. Both are needed because `e2e-slots.test.ts` only asks
	 * whether *some* package authors a slot, so one kit stamping it lets a spec pass while matching
	 * nothing in the other.
	 */
	it.each(['floating', 'inline'] as const)('names the selection count in the %s variant', (variant) => {
		const { container } = render(<ActionBar {...makeProps({ variant, selection: makeSelection({ count: 3 }) })} />)

		const count = container.querySelector('[data-slot="action-bar-selection-count"]')
		expect(count).not.toBeNull()
		expect(count).toHaveTextContent('3')
	})
})

describe('FilterChip draft mark (shadcn)', () => {
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
