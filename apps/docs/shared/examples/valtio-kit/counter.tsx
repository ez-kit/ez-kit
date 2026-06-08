'use client'

import { createContextStore } from '@ez-kit/valtio-kit'
import { proxy } from 'valtio'

type CounterState = {
	count: number
	increment: () => void
	decrement: () => void
	reset: () => void
}

type CounterInit = {
	initialCount?: number
}

const counterStore = createContextStore(({ initialCount = 0 }: CounterInit) => {
	const state = proxy<CounterState>({
		count: initialCount,
		increment: () => {
			state.count += 1
		},
		decrement: () => {
			state.count -= 1
		},
		reset: () => {
			state.count = initialCount
		},
	})

	return state
})

function CounterDisplay() {
	const snap = counterStore.useSnapshot()

	return (
		<div className='flex items-center gap-3'>
			<button
				type='button'
				onClick={snap.decrement}
				className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				−
			</button>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{snap.count}</output>
			<button
				type='button'
				onClick={snap.increment}
				className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				+
			</button>
			<button
				type='button'
				onClick={snap.reset}
				className='ml-2 rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground'
			>
				reset
			</button>
		</div>
	)
}

export default function CounterExample() {
	return (
		<counterStore.Provider initialCount={0}>
			<CounterDisplay />
		</counterStore.Provider>
	)
}
