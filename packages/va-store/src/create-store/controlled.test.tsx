import { shallowEqual } from '@ez-kit/store-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { proxy, subscribe } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createStore } from './index'

import type { StoreInit } from './index'

type CounterState = {
	count: number
	label: string
	users: readonly string[]
	handleSubmit?: () => void
}

type CounterDefaultValue = {
	count?: number
	label?: string
	users?: readonly string[]
	handleSubmit?: () => void
}

function assertDefined<T>(value: T | undefined): T {
	if (value === undefined) throw new Error('expected value to be defined')
	return value
}

function counterFactory({ defaultValue }: StoreInit<CounterDefaultValue>) {
	return proxy<CounterState>({
		count: defaultValue.count ?? 0,
		label: defaultValue.label ?? 'initial',
		users: defaultValue.users ?? [],
		...(defaultValue.handleSubmit ? { handleSubmit: defaultValue.handleSubmit } : {}),
	})
}

describe('@ez-kit/va-store — controlled value', () => {
	it('lets value win over defaultValue for its own key on mount, while other keys still seed from defaultValue', () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			return (
				<>
					<span data-testid='count'>{snap.count}</span>
					<span data-testid='label'>{snap.label}</span>
				</>
			)
		}

		render(
			<store.Provider
				defaultValue={{ count: 1, label: 'boot' }}
				value={{ count: 99 }}
			>
				<View />
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('99')
		expect(screen.getByTestId('label')).toHaveTextContent('boot')
	})

	it('syncs the store when the value prop changes', () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			return <span data-testid='count'>{snap.count}</span>
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('1')

		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 5 }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('5')
	})

	it('does not write when a new value object holds the same values (default Object.is per key, primitives)', () => {
		const store = createStore(counterFactory)
		let raw: CounterState | undefined

		function CaptureStore() {
			raw = store.useStore()
			return null
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<CaptureStore />
			</store.Provider>,
		)

		const notify = vi.fn()
		const unsubscribe = subscribe(assertDefined(raw), notify)

		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<CaptureStore />
			</store.Provider>,
		)

		expect(notify).not.toHaveBeenCalled()
		unsubscribe()
	})

	it('suppresses writes for a custom equals when a new reference holds the same values', () => {
		const store = createStore(counterFactory, { controlled: { users: { equals: shallowEqual } } })
		let raw: CounterState | undefined

		function CaptureStore() {
			raw = store.useStore()
			return null
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<CaptureStore />
			</store.Provider>,
		)

		const notify = vi.fn()
		const unsubscribe = subscribe(assertDefined(raw), notify)

		// Fresh array reference, same contents — transform(dto)-style prop.
		rerender(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<CaptureStore />
			</store.Provider>,
		)

		expect(notify).not.toHaveBeenCalled()
		unsubscribe()
	})

	it('still writes through a custom equals when the values actually differ', () => {
		const store = createStore(counterFactory, { controlled: { users: { equals: shallowEqual } } })

		function View() {
			const snap = store.useSnapshot()
			return <span data-testid='users'>{snap.users.join(',')}</span>
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<View />
			</store.Provider>,
		)

		rerender(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'c'] }}
			>
				<View />
			</store.Provider>,
		)

		expect(screen.getByTestId('users')).toHaveTextContent('a,c')
	})

	it('calls a custom set instead of the default direct write, passing only the controlled value', () => {
		const setUsers = vi.fn()
		const store = createStore(counterFactory, {
			controlled: {
				users: {
					set: (state, value) => {
						setUsers(state, value)
					},
				},
			},
		})

		render(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a'] }}
			/>,
		)

		expect(setUsers).toHaveBeenCalledTimes(1)
		expect(setUsers.mock.calls[0]?.[1]).toStrictEqual(['a'])
	})

	it('lets a local write to a controlled field live until the next value change', async () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			const state = store.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						state.count += 1
					}}
					data-testid='count'
				>
					{snap.count}
				</button>
			)
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<View />
			</store.Provider>,
		)

		fireEvent.click(screen.getByTestId('count'))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})

		// Same value prop re-render: local write survives, no forced rollback.
		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('2')

		// A genuinely new value prop re-asserts control.
		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 7 }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('7')
	})

	it('calls onValueChange on an internal write, with only the controlled keys', async () => {
		const store = createStore(counterFactory)
		const onValueChange = vi.fn()

		function View() {
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
			<store.Provider
				defaultValue={{ count: 1, label: 'boot' }}
				value={{ count: 1 }}
				onValueChange={onValueChange}
			>
				<View />
			</store.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'inc' }))

		await waitFor(() => {
			expect(onValueChange).toHaveBeenCalledTimes(1)
		})
		expect(onValueChange).toHaveBeenCalledWith({ count: 2 })
	})

	it('does not call onValueChange for the sync it just applied from the value prop (anti-echo)', async () => {
		const onValueChange = vi.fn()
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			return <span data-testid='count'>{snap.count}</span>
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
				onValueChange={onValueChange}
			>
				<View />
			</store.Provider>,
		)

		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 9 }}
				onValueChange={onValueChange}
			>
				<View />
			</store.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('9')

		// Valtio defers subscribe callbacks to a microtask, so asserting synchronously here would
		// pass even with anti-echo removed entirely. Flush before asserting.
		await Promise.resolve()
		await Promise.resolve()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('emits an object-typed controlled field as a snapshot, not the live mutable proxy', async () => {
		const store = createStore(counterFactory)
		const onValueChange = vi.fn()
		let raw: CounterState | undefined

		function View() {
			const state = store.useStore()
			raw = state
			return (
				<button
					type='button'
					onClick={() => {
						state.users = ['x', 'y']
					}}
				>
					write
				</button>
			)
		}

		render(
			<store.Provider
				defaultValue={{ users: [] }}
				value={{ users: [] }}
				onValueChange={onValueChange}
			>
				<View />
			</store.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'write' }))

		await waitFor(() => {
			expect(onValueChange).toHaveBeenCalledTimes(1)
		})

		const emitted = onValueChange.mock.calls[0]?.[0] as { users: readonly string[] }
		expect(emitted.users).toStrictEqual(['x', 'y'])
		// The emitted value must not be the live proxy field, or a parent holding onto it could write
		// past the Provider's own write path.
		expect(emitted.users).not.toBe(assertDefined(raw).users)
	})

	it('reflects a fresh callback passed via value after the parent re-renders (no stale closure)', () => {
		const store = createStore(counterFactory)
		const firstHandler = vi.fn()
		const secondHandler = vi.fn()

		function InvokeButton() {
			const snap = store.useSnapshot()
			return (
				<button
					type='button'
					onClick={() => snap.handleSubmit?.()}
				>
					submit
				</button>
			)
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{}}
				value={{ handleSubmit: firstHandler }}
			>
				<InvokeButton />
			</store.Provider>,
		)

		rerender(
			<store.Provider
				defaultValue={{}}
				value={{ handleSubmit: secondHandler }}
			>
				<InvokeButton />
			</store.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'submit' }))

		expect(firstHandler).not.toHaveBeenCalled()
		expect(secondHandler).toHaveBeenCalledTimes(1)
	})

	it('replaces a nested key wholesale rather than merging into it', () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			return <span data-testid='users'>{JSON.stringify(snap.users)}</span>
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('users')).toHaveTextContent('["a","b"]')

		rerender(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['c'] }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('users')).toHaveTextContent('["c"]')
	})

	it('stops controlling a key once it is removed from value, without reverting to defaultValue', async () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			const state = store.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						state.count += 1
					}}
					data-testid='count'
				>
					{snap.count}
				</button>
			)
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 5 }}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('5')

		// `count` drops out of value: it becomes uncontrolled, current value (5) is kept as-is.
		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{}}
			>
				<View />
			</store.Provider>,
		)
		expect(screen.getByTestId('count')).toHaveTextContent('5')

		fireEvent.click(screen.getByTestId('count'))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('6')
		})
	})

	it('creates the proxy exactly once under StrictMode double-invocation', async () => {
		const store = createStore(counterFactory)

		function View() {
			const snap = store.useSnapshot()
			const state = store.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						state.count += 1
					}}
					data-testid='count'
				>
					{snap.count}
				</button>
			)
		}

		render(
			<StrictMode>
				<store.Provider
					defaultValue={{ count: 1 }}
					value={{ count: 1 }}
				>
					<View />
				</store.Provider>
			</StrictMode>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('1')
		fireEvent.click(screen.getByTestId('count'))
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})
})
