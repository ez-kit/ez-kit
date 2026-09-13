import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BetweenInput } from './BetweenInput'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

const PRESETS = [
	{ id: 'today', label: 'Today', getRange: () => ({ from: '2026-05-14', to: '2026-05-14' }) },
	{ id: 'last7', label: 'Last 7 days', getRange: () => ({ from: '2026-05-08', to: '2026-05-14' }) },
]

function makeProps(overrides: Partial<BetweenInputProps> = {}): BetweenInputProps {
	return {
		value: {},
		onChange: vi.fn(),
		variant: 'inputs',
		type: 'date',
		presets: PRESETS,
		onPresetSelect: vi.fn(),
		...overrides,
	}
}

describe('between presets', () => {
	it('offers the presets behind one trigger rather than a chip per preset', async () => {
		const onPresetSelect = vi.fn()
		render(<BetweenInput {...makeProps({ onPresetSelect })} />)

		// Inline in a column header, a chip row wrapped onto three lines and took the whole
		// header row down with it.
		expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: 'Quick ranges' }))
		await userEvent.click(screen.getByRole('menuitem', { name: 'Today' }))

		expect(onPresetSelect).toHaveBeenCalledWith(PRESETS[0])
	})

	it('names the preset the current range came from', () => {
		render(<BetweenInput {...makeProps({ value: { from: '2026-05-08', to: '2026-05-14' } })} />)

		expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('data-active-preset', 'last7')
	})

	it('stays unnamed when the range was typed by hand', () => {
		render(<BetweenInput {...makeProps({ value: { from: '2026-05-08', to: '2026-05-11' } })} />)

		const trigger = screen.getByRole('button', { name: 'Quick ranges' })
		expect(trigger).not.toHaveAttribute('data-active-preset')
	})
})
