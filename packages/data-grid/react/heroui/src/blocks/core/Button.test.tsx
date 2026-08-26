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
})
