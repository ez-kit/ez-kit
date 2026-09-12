import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore, type ContextStoreInit } from './index'

type CounterState = { count: number }
type CounterDefaultValue = { count?: number }

const counterFactory = ({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	proxy<CounterState>({ count: defaultValue.count ?? 0 })

describe('createContextStore — Store', () => {
	it('hands the raw proxy to its child, and writes through it reach snapshot readers', async () => {
		const store = createContextStore(counterFactory)

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Subscribe>{(snap) => <span data-testid='count'>{snap.count}</span>}</store.Subscribe>
				<store.Store>
					{(state) => (
						<button
							type='button'
							onClick={() => {
								state.count += 1
							}}
						>
							inc
						</button>
					)}
				</store.Store>
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('1')
		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})

	it('does not re-render its child on store mutations, unlike Subscribe', async () => {
		const store = createContextStore(counterFactory)
		let storeRenders = 0
		let itemRenders = 0

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Subscribe>
					{(snap) => {
						itemRenders += 1
						return <span data-testid='count'>{snap.count}</span>
					}}
				</store.Subscribe>
				<store.Store>
					{(state) => {
						storeRenders += 1
						return (
							<button
								type='button'
								onClick={() => {
									state.count += 1
								}}
							>
								inc
							</button>
						)
					}}
				</store.Store>
			</store.Provider>,
		)

		const storeRendersAfterMount = storeRenders
		const itemRendersAfterMount = itemRenders

		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})

		expect(itemRenders).toBeGreaterThan(itemRendersAfterMount)
		expect(storeRenders).toBe(storeRendersAfterMount)
	})

	it('names the store in the missing-Provider error raised by Store', () => {
		const store = createContextStore(counterFactory)
		expect(() => render(<store.Store>{() => <span />}</store.Store>)).toThrowError('Missing Provider for store')
	})
})
