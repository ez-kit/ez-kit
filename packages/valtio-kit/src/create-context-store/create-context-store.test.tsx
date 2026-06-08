import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore } from './index'

type CounterState = {
	count: number
	label: string
}

type CounterInitProps = {
	count?: number
	label?: string
}

const createCounterStore = (initProps: CounterInitProps) =>
	proxy<CounterState>({
		count: initProps.count ?? 0,
		label: initProps.label ?? 'initial',
	})

const counter = createContextStore(createCounterStore)

function CountView() {
	const snap = counter.useSnapshot()
	return <span data-testid='count'>{snap.count}</span>
}

function IncrementButton() {
	const state = counter.useStore()
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
			<counter.Provider count={3} label='boot'>
				<CountView />
			</counter.Provider>,
		)

		expect(screen.getByTestId('count')).toHaveTextContent('3')
	})

	it('re-renders snapshot consumers when the proxy is mutated via useStore', async () => {
		render(
			<counter.Provider count={1} label='boot'>
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
			const state = counter.useStore()
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
			<counter.Provider count={1} label='boot'>
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

	it('supports the Item render-prop receiving the snapshot', () => {
		render(
			<counter.Provider count={5} label='boot'>
				<counter.Item>{(snap) => <span data-testid='item-count'>{snap.count}</span>}</counter.Item>
			</counter.Provider>,
		)

		expect(screen.getByTestId('item-count')).toHaveTextContent('5')
	})

	it('keeps sibling Providers isolated', async () => {
		render(
			<>
				<counter.Provider count={1} label='a'>
					<div data-testid='tree-a'>
						<CountView />
						<IncrementButton />
					</div>
				</counter.Provider>
				<counter.Provider count={99} label='b'>
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
			counter.useStore()
			return <div />
		}

		expect(() => render(<BrokenConsumer />)).toThrowError('Missing Provider for createContextStore')
	})

	it('forwards options to useSnapshot (sync)', async () => {
		function SyncCountView() {
			const snap = counter.useSnapshot({ sync: true })
			return <span data-testid='sync-count'>{snap.count}</span>
		}

		render(
			<counter.Provider count={0} label='boot'>
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
})
