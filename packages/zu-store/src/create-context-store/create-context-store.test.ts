import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand'

import { createContextStore } from './index'

interface CounterState {
	count: number
	label: string
	increment: () => void
	setLabel: (label: string) => void
}

interface CounterInitProps {
	count?: number
	label?: string
}

const createCounterStore = (initProps: CounterInitProps) => {
	const defaultProps: Required<CounterInitProps> = {
		count: 0,
		label: 'initial',
	}

	return createStore<CounterState>()((set) => ({
		...defaultProps,
		...initProps,
		increment: () => {
			set((state) => ({ count: state.count + 1 }))
		},
		setLabel: (label) => {
			set(() => ({ label }))
		},
	}))
}

const counterContextStore = createContextStore(createCounterStore)

describe('@ez-kit/zu-store', () => {
	it('creates store in Provider and reads selected slice with useStore', () => {
		function CountView() {
			const count = counterContextStore.useStore((state) => state.count)
			return createElement('span', { 'data-testid': 'count' }, String(count))
		}

		render(createElement(counterContextStore.Provider, { count: 3, label: 'boot' }, createElement(CountView)))

		expect(screen.getByTestId('count')).toHaveTextContent('3')
	})

	it('updates state through actions selected by useStore', () => {
		function CountView() {
			const count = counterContextStore.useStore((state) => state.count)
			return createElement('span', { 'data-testid': 'count' }, String(count))
		}

		function IncrementButton() {
			const increment = counterContextStore.useStore((state) => state.increment)
			return createElement('button', { type: 'button', onClick: increment }, 'Increment')
		}

		render(
			createElement(
				counterContextStore.Provider,
				{ count: 1, label: 'boot' },
				createElement(CountView),
				createElement(IncrementButton),
			),
		)

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))

		expect(screen.getByTestId('count')).toHaveTextContent('2')
	})

	it('supports Item render-prop API', () => {
		render(
			createElement(
				counterContextStore.Provider,
				{ count: 5, label: 'boot' },
				createElement(counterContextStore.Item<number>, {
					selector: (state: CounterState) => state.count,
					children: (count: number) => createElement('span', { 'data-testid': 'item-count' }, String(count)),
				}),
			),
		)

		expect(screen.getByTestId('item-count')).toHaveTextContent('5')
	})

	it('uses shallow comparison in useShallowStore', () => {
		let renderCount = 0

		function ShallowCountView() {
			renderCount += 1
			const selected = counterContextStore.useShallowStore((state) => ({
				count: state.count,
			}))

			return createElement('span', { 'data-testid': 'shallow-count' }, String(selected.count))
		}

		function ChangeLabelButton() {
			const setLabel = counterContextStore.useStore((state) => state.setLabel)
			return createElement(
				'button',
				{
					type: 'button',
					onClick: () => {
						setLabel('changed')
					},
				},
				'Change label',
			)
		}

		function IncrementButton() {
			const increment = counterContextStore.useStore((state) => state.increment)
			return createElement('button', { type: 'button', onClick: increment }, 'Increment')
		}

		render(
			createElement(
				counterContextStore.Provider,
				{ count: 1, label: 'boot' },
				createElement(ShallowCountView),
				createElement(ChangeLabelButton),
				createElement(IncrementButton),
			),
		)

		expect(renderCount).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
		expect(renderCount).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: 'Increment' }))
		expect(renderCount).toBe(2)
		expect(screen.getByTestId('shallow-count')).toHaveTextContent('2')
	})

	it('throws when hook is used without Provider', () => {
		function BrokenConsumer() {
			counterContextStore.useStore((state) => state.count)
			return createElement('div')
		}

		expect(() => render(createElement(BrokenConsumer))).toThrowError('Missing Provider for createContextStore')
	})
})
