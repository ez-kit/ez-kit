import { createServiceRegistry, ServicesProvider, serviceKey } from '@ez-kit/store-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createStore, type StoreInit } from './index'

import type { StorePlugin } from '@ez-kit/store-core'

type CounterState = { count: number }
type CounterDefaultValue = { count?: number }

const counterFactory = ({ defaultValue }: StoreInit<CounterDefaultValue>) =>
	proxy<CounterState>({ count: defaultValue.count ?? 0 })

describe('createStore — plugin lifecycle (non-cached)', () => {
	it('runs setup on mount and cleanup on unmount exactly once', () => {
		const setup = vi.fn()
		const cleanup = vi.fn()
		const plugin: StorePlugin<CounterState> = {
			name: 'lifecycle',
			setup: (instance) => {
				setup(instance)
				return cleanup
			},
		}

		const store = createStore(counterFactory, { plugins: [plugin] })

		function CountView() {
			return <span data-testid='count'>{store.useSnapshot().count}</span>
		}
		function App({ show }: { show: boolean }) {
			return show ? (
				<store.Provider defaultValue={{ count: 1 }}>
					<CountView />
				</store.Provider>
			) : (
				<span>hidden</span>
			)
		}

		const { rerender } = render(<App show={true} />)
		expect(setup).toHaveBeenCalledTimes(1)
		expect(cleanup).not.toHaveBeenCalled()

		rerender(<App show={false} />)
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('passes the raw proxy and an SSR-false context to setup', () => {
		let receivedInstance: CounterState | undefined
		let receivedIsServer: boolean | undefined
		const plugin: StorePlugin<CounterState> = {
			name: 'inspect-ctx',
			setup: (instance, ctx) => {
				receivedInstance = instance
				receivedIsServer = ctx.isServer
				return undefined
			},
		}

		const store = createStore(counterFactory, { plugins: [plugin] })
		function CountView() {
			return <span data-testid='count'>{store.useSnapshot().count}</span>
		}
		render(
			<store.Provider defaultValue={{ count: 5 }}>
				<CountView />
			</store.Provider>,
		)

		// Plugin must receive the live mutable proxy, not a snapshot.
		expect(receivedInstance).toBeDefined()
		if (receivedInstance) receivedInstance.count = 9
		expect(receivedInstance?.count).toBe(9)
		expect(receivedIsServer).toBe(false)
	})
})

describe('createStore — service resolution', () => {
	it('resolves a service provided by an ancestor ServicesProvider', () => {
		const GREETING = serviceKey<string>('test.greeting')
		let resolved: string | undefined
		const plugin: StorePlugin<CounterState> = {
			name: 'resolve-service',
			setup: (_instance, ctx) => {
				resolved = ctx.services.get(GREETING)
				return undefined
			},
		}

		const store = createStore(counterFactory, { plugins: [plugin] })
		const registry = createServiceRegistry([[GREETING, 'hello']])
		function CountView() {
			return <span>{store.useSnapshot().count}</span>
		}

		render(
			<ServicesProvider registry={registry}>
				<store.Provider defaultValue={{ count: 0 }}>
					<CountView />
				</store.Provider>
			</ServicesProvider>,
		)

		expect(resolved).toBe('hello')
	})
})

describe('createStore — base behavior without plugins', () => {
	it('creates the proxy once per Provider and re-renders snapshot consumers on mutation', async () => {
		const store = createStore(counterFactory)

		function CountView() {
			return <span data-testid='count'>{store.useSnapshot().count}</span>
		}
		function IncrementButton() {
			const state = store.useStore()
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
		}

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<CountView />
				<IncrementButton />
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('1')
		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})

	it('throws the createContextStore error message when used without a Provider', () => {
		const store = createStore(counterFactory)
		function Broken() {
			store.useSnapshot()
			return null
		}
		expect(() => render(<Broken />)).toThrowError('Missing Provider for createContextStore')
	})

	it('throws the createContextStore error message when useStore is used without a Provider', () => {
		const store = createStore(counterFactory)
		function Broken() {
			store.useStore()
			return null
		}
		expect(() => render(<Broken />)).toThrowError('Missing Provider for createContextStore')
	})

	it('exposes useSnapshot as the reactive read alongside the raw useStore write path', async () => {
		const store = createStore(counterFactory)

		function CountView() {
			return <span data-testid='count'>{store.useSnapshot().count}</span>
		}
		function IncrementButton() {
			const state = store.useStore()
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
		}

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<CountView />
				<IncrementButton />
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('1')
		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})
})

describe('createStore — StoreItem', () => {
	it('hands the raw proxy to its child, and writes through it reach snapshot readers', async () => {
		const store = createStore(counterFactory)

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Item>{({ snap }) => <span data-testid='count'>{snap.count}</span>}</store.Item>
				<store.StoreItem>
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
				</store.StoreItem>
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('1')
		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})

	it('does not re-render its child on store mutations, unlike Item', async () => {
		const store = createStore(counterFactory)
		let storeItemRenders = 0
		let itemRenders = 0

		render(
			<store.Provider defaultValue={{ count: 1 }}>
				<store.Item>
					{({ snap }) => {
						itemRenders += 1
						return <span data-testid='count'>{snap.count}</span>
					}}
				</store.Item>
				<store.StoreItem>
					{(state) => {
						storeItemRenders += 1
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
				</store.StoreItem>
			</store.Provider>,
		)

		const storeItemRendersAfterMount = storeItemRenders
		const itemRendersAfterMount = itemRenders

		fireEvent.click(screen.getByRole('button', { name: 'inc' }))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})

		expect(itemRenders).toBeGreaterThan(itemRendersAfterMount)
		expect(storeItemRenders).toBe(storeItemRendersAfterMount)
	})

	it('throws the createContextStore error message when used without a Provider', () => {
		const store = createStore(counterFactory)
		expect(() => render(<store.StoreItem>{() => <span />}</store.StoreItem>)).toThrowError(
			'Missing Provider for createContextStore',
		)
	})
})
