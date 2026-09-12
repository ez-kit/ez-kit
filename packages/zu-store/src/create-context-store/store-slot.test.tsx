import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore, type ContextStoreInit } from './index'

type CounterState = { count: number }
type CounterDefaultValue = { count?: number }

const counterFactory = ({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	createStore<CounterState>()(() => ({ count: defaultValue.count ?? 0 }))

describe('createContextStore — Store', () => {
	it('hands the raw store handle to its child, and writes through it reach selector readers', async () => {
		const store = createContextStore(counterFactory)

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Subscribe selector={(state) => state.count}>
					{(count) => <span data-testid='count'>{count}</span>}
				</store.Subscribe>
				<store.Store>
					{(handle) => (
						<button
							type='button'
							onClick={() => {
								handle.setState({ count: handle.getState().count + 1 })
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

	it('does not re-render its child on store writes, unlike Subscribe', async () => {
		const store = createContextStore(counterFactory)
		let storeRenders = 0
		let itemRenders = 0

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Subscribe selector={(state) => state.count}>
					{(count) => {
						itemRenders += 1
						return <span data-testid='count'>{count}</span>
					}}
				</store.Subscribe>
				<store.Store>
					{(handle) => {
						storeRenders += 1
						return (
							<button
								type='button'
								onClick={() => {
									handle.setState({ count: handle.getState().count + 1 })
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
		expect(() => render(<store.Store>{() => <span />}</store.Store>)).toThrowError(
			'[zu-store] Missing Provider for store',
		)
	})
})

describe('createContextStore — Subscribe hands over the store handle', () => {
	it('passes the raw handle as the second render argument, by reference and shallow alike', async () => {
		const store = createContextStore(counterFactory)

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Subscribe selector={(state) => state.count}>
					{(count, handle) => (
						<button
							type='button'
							onClick={() => {
								handle.setState({ count: count + 1 })
							}}
						>
							by-reference {count}
						</button>
					)}
				</store.Subscribe>
				<store.Subscribe
					shallow
					selector={(state) => ({ count: state.count })}
				>
					{({ count }, handle) => (
						<button
							type='button'
							onClick={() => {
								handle.setState({ count: count + 10 })
							}}
						>
							shallow {count}
						</button>
					)}
				</store.Subscribe>
			</store.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'by-reference 1' }))
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'shallow 2' })).toBeInTheDocument()
		})

		fireEvent.click(screen.getByRole('button', { name: 'shallow 2' }))
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'by-reference 12' })).toBeInTheDocument()
		})
	})
})
