import { render, fireEvent } from '@testing-library/react'
import { forwardRef, memo, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { flexRender } from './flex-render'

/**
 * These are the three things a renderer could not do while `flexRender` invoked it as a plain
 * function instead of mounting it. Each one is a capability a custom cell needs the moment it
 * stops being a pure formatter — a popover, an async select, a date picker with its own state.
 */
describe('flexRender', () => {
	it('mounts a function component so it may own hook state', () => {
		function Counter() {
			const [n, setN] = useState(0)
			return (
				<button
					onClick={() => {
						setN((v) => v + 1)
					}}
				>
					{n}
				</button>
			)
		}

		const { getByRole } = render(<>{flexRender(Counter, {})}</>)
		const button = getByRole('button')
		expect(button.textContent).toBe('0')
		fireEvent.click(button)
		// State survives because the renderer has its own fiber. Called as `Counter({})` the
		// hook would have landed on the caller's fiber instead.
		expect(button.textContent).toBe('1')
	})

	it('accepts a memo-wrapped component', () => {
		const Memoized = memo(function Cell({ value }: { value: string }) {
			return <span data-testid='memo'>{value}</span>
		})

		const { getByTestId } = render(<>{flexRender(Memoized, { value: 'ok' })}</>)
		expect(getByTestId('memo').textContent).toBe('ok')
	})

	it('accepts a forwardRef-wrapped component', () => {
		const Forwarded = forwardRef<HTMLSpanElement, { value: string }>(function Cell({ value }, ref) {
			return (
				<span
					ref={ref}
					data-testid='fwd'
				>
					{value}
				</span>
			)
		})

		const { getByTestId } = render(<>{flexRender(Forwarded, { value: 'ok' })}</>)
		expect(getByTestId('fwd').textContent).toBe('ok')
	})

	it('passes elements and literals through untouched', () => {
		const { container } = render(<>{flexRender(<b>el</b>, {})}</>)
		expect(container.textContent).toBe('el')
		expect(flexRender('text', {})).toBe('text')
		expect(flexRender(7, {})).toBe(7)
		expect(flexRender(null, {})).toBeNull()
		expect(flexRender(undefined, {})).toBeNull()
	})
})
