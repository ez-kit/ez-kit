import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FilterTextInput } from './filter-text-input'

import type { InputProps } from '../types'

function TestInput(props: InputProps) {
	return (
		<input
			aria-label='filter'
			{...props}
		/>
	)
}

afterEach(() => {
	vi.useRealTimers()
})

describe('FilterTextInput', () => {
	it('commits on every keystroke when debounce is 0 (backward compatible)', () => {
		const onCommit = vi.fn()
		render(
			<FilterTextInput
				Input={TestInput}
				value=''
				onCommit={onCommit}
				placeholder='Filter…'
				debounce={0}
			/>,
		)

		const input = screen.getByLabelText('filter')
		fireEvent.change(input, { target: { value: 'a' } })
		fireEvent.change(input, { target: { value: 'ab' } })

		expect(onCommit).toHaveBeenCalledTimes(2)
		expect(onCommit).toHaveBeenNthCalledWith(1, 'a')
		expect(onCommit).toHaveBeenNthCalledWith(2, 'ab')
	})

	it('commits only after the debounce delay, not on every keystroke', () => {
		vi.useFakeTimers()
		const onCommit = vi.fn()
		render(
			<FilterTextInput
				Input={TestInput}
				value=''
				onCommit={onCommit}
				placeholder='Filter…'
				debounce={200}
			/>,
		)

		const input = screen.getByLabelText('filter')
		fireEvent.change(input, { target: { value: 'a' } })
		fireEvent.change(input, { target: { value: 'ab' } })
		fireEvent.change(input, { target: { value: 'abc' } })

		// Nothing committed while the user is still typing within the window.
		expect(onCommit).not.toHaveBeenCalled()

		act(() => {
			vi.advanceTimersByTime(200)
		})

		// Exactly one commit with the final value.
		expect(onCommit).toHaveBeenCalledTimes(1)
		expect(onCommit).toHaveBeenCalledWith('abc')
	})

	it('syncs the input when the external filter value changes (e.g. Clear-all / reset)', () => {
		function Harness() {
			const [value, setValue] = useState('initial')
			return (
				<>
					<FilterTextInput
						Input={TestInput}
						value={value}
						onCommit={() => {}}
						placeholder='Filter…'
						debounce={0}
					/>
					<button
						onClick={() => {
							setValue('')
						}}
					>
						reset
					</button>
				</>
			)
		}
		render(<Harness />)

		const input = screen.getByLabelText<HTMLInputElement>('filter')
		expect(input.value).toBe('initial')

		fireEvent.click(screen.getByRole('button', { name: 'reset' }))
		expect(input.value).toBe('')
	})
})
