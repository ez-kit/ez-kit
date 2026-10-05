import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

import type { MouseEvent } from 'react'

describe('heroui Button', () => {
	it('forwards onClick to react-aria and hands it a real MouseEvent', async () => {
		// `currentTarget` is only populated while the event is being dispatched, so it is
		// read inside the handler rather than off the recorded call.
		let currentTarget: EventTarget | null = null
		let canPreventDefault = false
		const onClick = vi.fn((event: MouseEvent<HTMLButtonElement>) => {
			currentTarget = event.currentTarget
			canPreventDefault = typeof event.preventDefault === 'function'
		})
		render(<Button onClick={onClick}>Press me</Button>)

		await userEvent.click(screen.getByRole('button', { name: 'Press me' }))

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(currentTarget).toBeInstanceOf(HTMLButtonElement)
		expect(canPreventDefault).toBe(true)
	})

	it('fires onClick on keyboard activation', async () => {
		const onClick = vi.fn()
		render(<Button onClick={onClick}>Press me</Button>)

		screen.getByRole('button', { name: 'Press me' }).focus()
		await userEvent.keyboard('{Enter}')

		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it('maps disabled onto isDisabled', () => {
		render(<Button disabled>Press me</Button>)

		expect(screen.getByRole('button', { name: 'Press me' })).toBeDisabled()
	})

	/**
	 * **`aria-roledescription` does not reach the DOM through this slot, and that is measured rather
	 * than assumed.** React Aria's button filters the props it forwards against an allow-list, and
	 * that attribute is not on it: rendered with all four of `aria-label`, `aria-describedby`,
	 * `data-slot` and `aria-roledescription`, the first three land on the `<button>` and the fourth
	 * is absent. The adapter is not what drops it — it spreads the caller's props before its own
	 * two, and `ButtonProps` (`ButtonHTMLAttributes & RefAttributes`) accepts the attribute
	 * perfectly well.
	 *
	 * Why it matters: the drag handle renders this slot, and `@dnd-kit/dom`'s `Accessibility` plugin
	 * writes `aria-roledescription="draggable"` — English, from the library — onto any handle that
	 * does not already carry one (`index.js:251-258`). So a grid that sets the attribute from its
	 * message catalogue gets its own wording in the shadcn kit and the library's English here. This
	 * case pins that difference instead of letting a future reader assume parity; the shadcn kit's
	 * `blocks/core/Button.test.tsx` holds the other half.
	 *
	 * Asserted as the current behaviour, not as something desirable. The attribute could be forced
	 * on through a `ref`, which would be an imperative DOM write in a slot every button in the kit
	 * renders — not a trade to make silently.
	 */
	it('drops aria-roledescription, so the library’s own wording stays on the handle', () => {
		render(
			<Button
				aria-roledescription='sortable row'
				aria-label='Drag row'
			>
				Drag
			</Button>,
		)
		const button = screen.getByRole('button', { name: 'Drag row' })

		expect(button).not.toHaveAttribute('aria-roledescription')
		// The neighbouring attributes do arrive, so the case is about the allow-list and not about a
		// prop the adapter failed to pass on.
		expect(button).toHaveAttribute('aria-label', 'Drag row')
	})
})
