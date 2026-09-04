import { attachCapability, createServiceRegistry, serviceKey } from '@ez-kit/store-core'
import { ServicesProvider } from '@ez-kit/store-core/react'
import { render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createContextStore, type ContextStoreInit } from './index'

import type { StorePlugin } from '@ez-kit/store-core'

type CounterState = { count: number }
type CounterDefaultValue = { count?: number }

const counterFactory = ({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	proxy<CounterState>({ count: defaultValue.count ?? 0 })

describe('createContextStore — capability lifecycle (non-cached)', () => {
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

		const store = createContextStore((init) => {
			const state = counterFactory(init)
			attachCapability(state, plugin)
			return state
		})

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

		const store = createContextStore((init) => {
			const state = counterFactory(init)
			attachCapability(state, plugin)
			return state
		})
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

	it('runs setups in attachment order, innermost first', () => {
		const calls: string[] = []
		const store = createContextStore(() => {
			const state = proxy({ count: 0 })
			attachCapability(state, { name: 'inner', setup: () => void calls.push('inner') })
			attachCapability(state, { name: 'outer', setup: () => void calls.push('outer') })
			return state
		})

		render(
			<store.Provider defaultValue={undefined}>
				<span>ok</span>
			</store.Provider>,
		)
		expect(calls).toEqual(['inner', 'outer'])
	})

	it('runs cleanups on unmount, in reverse order', () => {
		const calls: string[] = []
		const store = createContextStore(() => {
			const state = proxy({ count: 0 })
			attachCapability(state, { name: 'inner', setup: () => () => void calls.push('inner') })
			attachCapability(state, { name: 'outer', setup: () => () => void calls.push('outer') })
			return state
		})

		const { unmount } = render(
			<store.Provider defaultValue={undefined}>
				<span>ok</span>
			</store.Provider>,
		)
		expect(calls).toEqual([])
		unmount()
		expect(calls).toEqual(['outer', 'inner'])
	})
})

describe('createContextStore — service resolution', () => {
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

		const store = createContextStore((init) => {
			const state = counterFactory(init)
			attachCapability(state, plugin)
			return state
		})
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
