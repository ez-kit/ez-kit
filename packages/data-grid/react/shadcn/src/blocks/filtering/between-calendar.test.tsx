import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BetweenInput } from './BetweenInput'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

function makeProps(overrides: Partial<BetweenInputProps> = {}): BetweenInputProps {
	return {
		value: {},
		onChange: vi.fn(),
		variant: 'calendar',
		type: 'date',
		...overrides,
	}
}

/**
 * The calendar itself lives in a Radix portal that only mounts once the popover opens, which
 * jsdom cannot drive reliably — the click-by-click flow is covered in the browser instead.
 * What is asserted here is the always-mounted trigger: it must reflect the *committed* filter
 * value and nothing else, which is what "commit only a complete range" means from the outside.
 */
describe('calendar range trigger', () => {
	it('shows the empty state when no range is filtered', () => {
		render(<BetweenInput {...makeProps()} />)
		expect(screen.getByRole('button')).toHaveTextContent('Pick a range')
	})

	it('renders a committed range as both ends', () => {
		render(<BetweenInput {...makeProps({ value: { from: '2026-03-01', to: '2026-03-08' } })} />)
		const label = screen.getByRole('button').textContent
		expect(label).toContain('Mar 1, 2026')
		expect(label).toContain('Mar 8, 2026')
	})

	it('renders a partial value that arrived from elsewhere as an open end', () => {
		render(<BetweenInput {...makeProps({ value: { from: '2026-03-01' } })} />)
		expect(screen.getByRole('button').textContent).toContain('Mar 1, 2026 – …')
	})

	it('does not write a filter value just by mounting', () => {
		const onChange = vi.fn()
		render(<BetweenInput {...makeProps({ onChange })} />)
		expect(onChange).not.toHaveBeenCalled()
	})
})
