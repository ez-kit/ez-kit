import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { StepSide, useStepFocus } from './use-step-focus'

const SLOTS = { start: 'move-start', end: 'move-end' }

/** A three-row list with a step pair per row, reordered by swapping neighbours. */
function List() {
	const [ids, setIds] = useState(['a', 'b', 'c'])
	const { ref, keep } = useStepFocus(SLOTS)
	const step = (index: number, offset: number) => {
		const next = [...ids]
		const [moved] = next.splice(index, 1)
		if (moved !== undefined) next.splice(index + offset, 0, moved)
		setIds(next)
	}

	return (
		<div ref={ref}>
			{ids.map((id, index) => (
				<div
					key={id}
					data-column-id={id}
				>
					<button
						type='button'
						data-slot={SLOTS.start}
						aria-label={`${id} up`}
						disabled={index === 0}
						onClick={() => {
							keep(id, StepSide.Start)
							step(index, -1)
						}}
					/>
					<button
						type='button'
						data-slot={SLOTS.end}
						aria-label={`${id} down`}
						disabled={index === ids.length - 1}
						onClick={() => {
							keep(id, StepSide.End)
							step(index, 1)
						}}
					/>
				</div>
			))}
		</div>
	)
}

describe('useStepFocus', () => {
	it('keeps focus on the pressed step, so it can be pressed again', async () => {
		render(<List />)
		const down = screen.getByRole('button', { name: 'a down' })
		down.focus()

		await userEvent.keyboard('{Enter}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'a down' }))
	})

	it('moves focus to the other step when the pressed one is now disabled', async () => {
		render(<List />)
		screen.getByRole('button', { name: 'a down' }).focus()

		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard('{Enter}')

		expect(screen.getByRole('button', { name: 'a down' })).toBeDisabled()
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'a up' }))
	})
})
