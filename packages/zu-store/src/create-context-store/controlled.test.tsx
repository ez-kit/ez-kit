import { shallowEqual } from '@ez-kit/store-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand'

import { createContextStore } from './index'

import type { ContextStoreInit } from './index'

type CounterState = {
	count: number
	label: string
	users: readonly string[]
	handleSubmit?: () => void
	increment: () => void
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

function createCounterStore({ defaultValue }: ContextStoreInit<CounterDefaultValue>) {
	return createStore<CounterState>()((set) => ({
		count: defaultValue.count ?? 0,
		label: defaultValue.label ?? 'initial',
		users: defaultValue.users ?? [],
		...(defaultValue.handleSubmit ? { handleSubmit: defaultValue.handleSubmit } : {}),
		increment: () => {
			set((state) => ({ count: state.count + 1 }))
		},
	}))
}

describe('@ez-kit/zu-store — controlled value', () => {
	it('lets value win over defaultValue for its own key on mount, while other keys still seed from defaultValue', () => {
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			const label = store.useSelector((state) => state.label)
			return (
				<>
					<span data-testid='count'>{count}</span>
					<span data-testid='label'>{label}</span>
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
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			return <span data-testid='count'>{count}</span>
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
		const store = createContextStore(createCounterStore)
		let api: ReturnType<typeof createCounterStore> | undefined

		function CaptureApi() {
			api = store.useStore()
			return null
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<CaptureApi />
			</store.Provider>,
		)
		const setState = vi.spyOn(assertDefined(api), 'setState')

		rerender(
			<store.Provider
				defaultValue={{ count: 1 }}
				value={{ count: 1 }}
			>
				<CaptureApi />
			</store.Provider>,
		)

		expect(setState).not.toHaveBeenCalled()
	})

	it('suppresses writes for a custom equals when a new reference holds the same values', () => {
		const store = createContextStore(createCounterStore, { controlled: { users: { equals: shallowEqual } } })
		let api: ReturnType<typeof createCounterStore> | undefined

		function CaptureApi() {
			api = store.useStore()
			return null
		}

		const { rerender } = render(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<CaptureApi />
			</store.Provider>,
		)
		const setState = vi.spyOn(assertDefined(api), 'setState')

		// Fresh array reference, same contents — transform(dto)-style prop.
		rerender(
			<store.Provider
				defaultValue={{}}
				value={{ users: ['a', 'b'] }}
			>
				<CaptureApi />
			</store.Provider>,
		)

		expect(setState).not.toHaveBeenCalled()
	})

	it('still writes through a custom equals when the values actually differ', () => {
		const store = createContextStore(createCounterStore, { controlled: { users: { equals: shallowEqual } } })

		function View() {
			const users = store.useSelector((state) => state.users)
			return <span data-testid='users'>{users.join(',')}</span>
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
		const store = createContextStore(createCounterStore, {
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

	it('lets a local write to a controlled field live until the next value change', () => {
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			const increment = store.useSelector((state) => state.increment)
			return (
				<button
					type='button'
					onClick={increment}
					data-testid='count'
				>
					{count}
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
		expect(screen.getByTestId('count')).toHaveTextContent('2')

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

	it('calls onValueChange on an internal write, with only the controlled keys', () => {
		const store = createContextStore(createCounterStore)
		const onValueChange = vi.fn()

		function View() {
			const increment = store.useSelector((state) => state.increment)
			return (
				<button
					type='button'
					onClick={increment}
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

		expect(onValueChange).toHaveBeenCalledTimes(1)
		expect(onValueChange).toHaveBeenCalledWith({ count: 2 })
	})

	it('does not call onValueChange for the sync it just applied from the value prop (anti-echo)', () => {
		const onValueChange = vi.fn()
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			return <span data-testid='count'>{count}</span>
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
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('reflects a fresh callback passed via value after the parent re-renders (no stale closure)', () => {
		const store = createContextStore(createCounterStore)
		const firstHandler = vi.fn()
		const secondHandler = vi.fn()

		function InvokeButton() {
			const handleSubmit = store.useSelector((state) => state.handleSubmit)
			return (
				<button
					type='button'
					onClick={() => handleSubmit?.()}
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
		const store = createContextStore(createCounterStore)

		function View() {
			const users = store.useSelector((state) => state.users)
			return <span data-testid='users'>{JSON.stringify(users)}</span>
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

	it('stops controlling a key once it is removed from value, without reverting to defaultValue', () => {
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			const increment = store.useSelector((state) => state.increment)
			return (
				<button
					type='button'
					onClick={increment}
					data-testid='count'
				>
					{count}
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
		expect(screen.getByTestId('count')).toHaveTextContent('6')
	})

	it('creates the store exactly once under StrictMode double-invocation', () => {
		const store = createContextStore(createCounterStore)

		function View() {
			const count = store.useSelector((state) => state.count)
			const increment = store.useSelector((state) => state.increment)
			return (
				<button
					type='button'
					onClick={increment}
					data-testid='count'
				>
					{count}
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
		expect(screen.getByTestId('count')).toHaveTextContent('2')
	})
})
