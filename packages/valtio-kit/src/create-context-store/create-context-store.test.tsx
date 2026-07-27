import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { type ContextStoreInit, createContextStore } from './index'

type CounterState = {
	count: number
	label: string
}

type CounterDefaultValue = {
	count?: number
	label?: string
}

const createCounterStore = ({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	proxy<CounterState>({
		count: defaultValue.count ?? 0,
		label: defaultValue.label ?? 'initial',
	})

const counter = createContextStore(createCounterStore)

function CountView() {
	const snap = counter.useSnapshot()
	return <span data-testid='count'>{snap.count}</span>
}

function IncrementButton() {
	const state = counter.useContextStore()
	return (
		<button
			type='button'
			onClick={() => {
				// Mutating the proxy is the intended Valtio write path.
				// eslint-disable-next-line react-hooks/immutability
				state.count += 1
			}}
		>
			Increment
		</button>
	)
}

describe('@ez-kit/valtio-kit createContextStore', () => {
	it('reads seeded state via useSnapshot inside a Provider', () => {
		render(
			<counter.Provider defaultValue={{ count: 3, label: 'boot' }}>
				<CountView />
			</counter.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('3')
	})

	it('re-renders snapshot consumers when the proxy is mutated via useContextStore', async () => {
		render(
			<counter.Provider defaultValue={{ count: 1, label: 'boot' }}>
				<CountView />
				<IncrementButton />
			</counter.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))

		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('2')
		})
	})

	it('tracks per property: unrelated changes do not re-render', async () => {
		let countCommits = 0

		function TrackedCount() {
			const snap = counter.useSnapshot()
			useEffect(() => {
				countCommits += 1
			})
			return <span data-testid='tracked-count'>{snap.count}</span>
		}

		function ChangeLabelButton() {
			const state = counter.useContextStore()
			return (
				<button
					type='button'
					onClick={() => {
						// Mutating the proxy is the intended Valtio write path.
						// eslint-disable-next-line react-hooks/immutability
						state.label = 'changed'
					}}
				>
					Change label
				</button>
			)
		}

		render(
			<counter.Provider defaultValue={{ count: 1, label: 'boot' }}>
				<TrackedCount />
				<ChangeLabelButton />
				<IncrementButton />
			</counter.Provider>,
		)

		expect(countCommits).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
		// Give Valtio a microtask to flush any (unexpected) update.
		await Promise.resolve()
		expect(countCommits).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))
		await waitFor(() => {
			expect(countCommits).toBe(2)
		})
		expect(screen.getByTestId('tracked-count')).toHaveTextContent('2')
	})

	it('supports the Item render-prop receiving { snap, store }', () => {
		render(
			<counter.Provider defaultValue={{ count: 5, label: 'boot' }}>
				<counter.Item>{({ snap }) => <span data-testid='item-count'>{snap.count}</span>}</counter.Item>
			</counter.Provider>,
		)

		expect(screen.getByTestId('item-count')).toHaveTextContent('5')
	})

	it('Item exposes the raw store so it can both read and write', async () => {
		render(
			<counter.Provider defaultValue={{ count: 0, label: 'boot' }}>
				<counter.Item>
					{({ snap, store }) => (
						<button
							type='button'
							onClick={() => {
								// Mutating the proxy is the intended Valtio write path; `store` here is the raw proxy.
								store.count += 1
							}}
						>
							{snap.count}
						</button>
					)}
				</counter.Item>
			</counter.Provider>,
		)

		const button = screen.getByRole('button')
		expect(button).toHaveTextContent('0')

		fireEvent.click(button)

		await waitFor(() => {
			expect(button).toHaveTextContent('1')
		})
	})

	it('keeps sibling Providers isolated', async () => {
		render(
			<>
				<counter.Provider defaultValue={{ count: 1, label: 'a' }}>
					<div data-testid='tree-a'>
						<CountView />
						<IncrementButton />
					</div>
				</counter.Provider>
				<counter.Provider defaultValue={{ count: 99, label: 'b' }}>
					<div data-testid='tree-b'>
						<CountView />
					</div>
				</counter.Provider>
			</>,
		)

		const treeA = screen.getByTestId('tree-a')
		const treeB = screen.getByTestId('tree-b')

		expect(treeA).toHaveTextContent('1')
		expect(treeB).toHaveTextContent('99')

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))

		await waitFor(() => {
			expect(treeA).toHaveTextContent('2')
		})
		// Sibling Provider is unaffected.
		expect(treeB).toHaveTextContent('99')
	})

	it('throws when a hook is used without a Provider', () => {
		function BrokenConsumer() {
			counter.useSnapshot()
			return <div />
		}

		expect(() => render(<BrokenConsumer />)).toThrowError('Missing Provider for createContextStore')
	})

	it('throws when useContextStore is used without a Provider', () => {
		function BrokenWriter() {
			counter.useContextStore()
			return <div />
		}

		expect(() => render(<BrokenWriter />)).toThrowError('Missing Provider for createContextStore')
	})

	it('re-renders a useSnapshot consumer when the field it reads changes', async () => {
		function StoreCountView() {
			const snap = counter.useSnapshot()
			return <span data-testid='store-count'>{snap.count}</span>
		}

		render(
			<counter.Provider defaultValue={{ count: 4, label: 'boot' }}>
				<StoreCountView />
				<IncrementButton />
			</counter.Provider>,
		)

		expect(screen.getByTestId('store-count')).toHaveTextContent('4')

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))

		await waitFor(() => {
			expect(screen.getByTestId('store-count')).toHaveTextContent('5')
		})
	})

	it('does not subscribe a component that only calls useContextStore', async () => {
		let writerCommits = 0

		function WriterOnly() {
			const state = counter.useContextStore()
			useEffect(() => {
				writerCommits += 1
			})
			return (
				<button
					type='button'
					onClick={() => {
						// Mutating the proxy is the intended Valtio write path.
						// eslint-disable-next-line react-hooks/immutability
						state.count += 1
					}}
				>
					Write only
				</button>
			)
		}

		render(
			<counter.Provider defaultValue={{ count: 0, label: 'boot' }}>
				<CountView />
				<WriterOnly />
			</counter.Provider>,
		)

		expect(writerCommits).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: 'Write only' }))

		// The snapshot consumer re-renders, the raw-proxy consumer does not.
		await waitFor(() => {
			expect(screen.getByTestId('count')).toHaveTextContent('1')
		})
		expect(writerCommits).toBe(1)
	})

	it('forwards options to useSnapshot (sync)', async () => {
		function SyncCountView() {
			const snap = counter.useSnapshot({ sync: true })
			return <span data-testid='sync-count'>{snap.count}</span>
		}

		render(
			<counter.Provider defaultValue={{ count: 0, label: 'boot' }}>
				<SyncCountView />
				<IncrementButton />
			</counter.Provider>,
		)

		expect(screen.getByTestId('sync-count')).toHaveTextContent('0')

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))

		await waitFor(() => {
			expect(screen.getByTestId('sync-count')).toHaveTextContent('1')
		})
	})

	it('infers the seed type from ContextStoreInit and from a bare envelope', () => {
		// `defaultValue.value` only type-checks if TDefaultValue is correctly inferred (not `undefined`).
		const helperStore = createContextStore(({ defaultValue }: ContextStoreInit<{ value: number }>) =>
			proxy({ value: defaultValue.value }),
		)
		const bareStore = createContextStore(({ defaultValue }: { defaultValue: { value: number } }) =>
			proxy({ value: defaultValue.value }),
		)

		function HelperView() {
			const snap = helperStore.useSnapshot()
			return <span data-testid='helper'>{snap.value}</span>
		}
		function BareView() {
			const snap = bareStore.useSnapshot()
			return <span data-testid='bare'>{snap.value}</span>
		}

		render(
			<>
				<helperStore.Provider defaultValue={{ value: 7 }}>
					<HelperView />
				</helperStore.Provider>
				<bareStore.Provider defaultValue={{ value: 9 }}>
					<BareView />
				</bareStore.Provider>
			</>,
		)

		expect(screen.getByTestId('helper')).toHaveTextContent('7')
		expect(screen.getByTestId('bare')).toHaveTextContent('9')
	})
})
