import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GlobalFilterInput } from './GlobalFilterInput'

import type { GlobalFilterInputProps } from '@ez-kit/data-grid-react'

function makeProps(overrides: Partial<GlobalFilterInputProps> = {}): GlobalFilterInputProps {
	return {
		value: '',
		onChange: vi.fn(),
		placeholder: 'Search…',
		...overrides,
	}
}

describe('GlobalFilterInput (shadcn)', () => {
	it('commits typed text through onChange', () => {
		const onChange = vi.fn()
		render(<GlobalFilterInput {...makeProps({ onChange })} />)

		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ada' } })

		expect(onChange).toHaveBeenCalledWith('ada')
	})

	// The headless `<DataGrid.GlobalFilterInput />` wrapper only wires `onKeyDown` under
	// `draft` — this asserts the kit forwards it to the real `<input>` verbatim, so a
	// future edit that drops the passthrough (e.g. destructuring away the rest of the props)
	// fails here instead of silently dropping the Enter-applies-the-draft shortcut.
	it('forwards onKeyDown to the underlying input', () => {
		const onKeyDown = vi.fn()
		render(<GlobalFilterInput {...makeProps({ onKeyDown })} />)

		fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' })

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('does not throw when onKeyDown is omitted', () => {
		render(<GlobalFilterInput {...makeProps()} />)

		expect(() => {
			fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' })
		}).not.toThrow()
	})
})
