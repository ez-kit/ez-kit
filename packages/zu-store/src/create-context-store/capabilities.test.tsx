import { attachCapability, createServiceRegistry, serviceKey } from '@ez-kit/store-core'
import { ServicesProvider } from '@ez-kit/store-core/react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore, type ContextStoreInit } from './index'

import type { StorePlugin } from '@ez-kit/store-core'
import type { StoreApi } from 'zustand/vanilla'

type CounterState = { count: number }
type CounterDefaultValue = { count?: number }
type CounterStore = StoreApi<CounterState>

const counterFactory = ({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	createStore<CounterState>()(() => ({ count: defaultValue.count ?? 0 }))

describe('createContextStore — capability lifecycle (non-cached)', () => {
	it('runs setup on mount and cleanup on unmount exactly once', () => {
		const setup = vi.fn()
		const cleanup = vi.fn()
		const plugin: StorePlugin<CounterStore> = {
			name: 'lifecycle',
			setup: (instance) => {
				setup(instance)
				return cleanup
			},
		}

		const store = createContextStore<CounterStore, CounterDefaultValue>((init) => {
			const handle = counterFactory(init)
			attachCapability(handle, plugin)
			return handle
		})

		function CountView() {
			return <span data-testid='count'>{store.useSelector((state) => state.count)}</span>
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

	it('passes the live store handle and an SSR-false context to setup', () => {
		let receivedInstance: CounterStore | undefined
		let receivedIsServer: boolean | undefined
		const plugin: StorePlugin<CounterStore> = {
			name: 'inspect-ctx',
			setup: (instance, ctx) => {
				receivedInstance = instance
				receivedIsServer = ctx.isServer
				return undefined
			},
		}

		const store = createContextStore<CounterStore, CounterDefaultValue>((init) => {
			const handle = counterFactory(init)
			attachCapability(handle, plugin)
			return handle
		})
		function CountView() {
			return <span data-testid='count'>{store.useSelector((state) => state.count)}</span>
		}
		render(
			<store.Provider defaultValue={{ count: 5 }}>
				<CountView />
			</store.Provider>,
		)

		// The plugin must receive the writable handle — the seam persist writes through.
		expect(receivedInstance).toBeDefined()
		receivedInstance?.setState({ count: 9 })
		expect(receivedInstance?.getState().count).toBe(9)
		expect(receivedIsServer).toBe(false)
	})

	it('runs setups in attachment order, innermost first', () => {
		const calls: string[] = []
		const store = createContextStore<CounterStore>(() => {
			const handle = createStore<CounterState>()(() => ({ count: 0 }))
			attachCapability(handle, { name: 'inner', setup: () => void calls.push('inner') })
			attachCapability(handle, { name: 'outer', setup: () => void calls.push('outer') })
			return handle
		})

		render(
			<store.Provider>
				<span>ok</span>
			</store.Provider>,
		)
		expect(calls).toEqual(['inner', 'outer'])
	})

	it('runs cleanups on unmount, in reverse order', () => {
		const calls: string[] = []
		const store = createContextStore<CounterStore>(() => {
			const handle = createStore<CounterState>()(() => ({ count: 0 }))
			attachCapability(handle, { name: 'inner', setup: () => () => void calls.push('inner') })
			attachCapability(handle, { name: 'outer', setup: () => () => void calls.push('outer') })
			return handle
		})

		const { unmount } = render(
			<store.Provider>
				<span>ok</span>
			</store.Provider>,
		)
		expect(calls).toEqual([])
		unmount()
		expect(calls).toEqual(['outer', 'inner'])
	})

	it('rejects two capabilities with the same name on one store', () => {
		expect(() => {
			const handle = createStore<CounterState>()(() => ({ count: 0 }))
			attachCapability(handle, { name: 'persist', setup: () => undefined })
			attachCapability(handle, { name: 'persist', setup: () => undefined })
		}).toThrow(/persist/)
	})
})

describe('createContextStore — service resolution', () => {
	it('resolves a service provided by an ancestor ServicesProvider', () => {
		const GREETING = serviceKey<string>('test.greeting')
		let resolved: string | undefined
		const plugin: StorePlugin<CounterStore> = {
			name: 'resolve-service',
			setup: (_instance, ctx) => {
				resolved = ctx.services.get(GREETING)
				return undefined
			},
		}

		const store = createContextStore<CounterStore, CounterDefaultValue>((init) => {
			const handle = counterFactory(init)
			attachCapability(handle, plugin)
			return handle
		})
		const registry = createServiceRegistry([[GREETING, 'hello']])
		function CountView() {
			return <span>{store.useSelector((state) => state.count)}</span>
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
