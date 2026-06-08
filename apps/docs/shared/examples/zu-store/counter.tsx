'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand/vanilla'

type CounterState = {
	count: number
	increment: () => void
	decrement: () => void
	reset: () => void
}

type CounterDefaultValue = {
	initialCount?: number
}

const counterStore = createContextStore(({ defaultValue }: ContextStoreInit<CounterDefaultValue>) => {
	const initialCount = defaultValue.initialCount ?? 0
	return createStore<CounterState>()((set, get) => ({
		count: initialCount,
		increment: () => { set({ count: get().count + 1 }); },
		decrement: () => { set({ count: get().count - 1 }); },
		reset: () => { set({ count: initialCount }); },
	}))
})

function CounterDisplay() {
	const count = counterStore.useStore((s) => s.count)
	const increment = counterStore.useStore((s) => s.increment)
	const decrement = counterStore.useStore((s) => s.decrement)
	const reset = counterStore.useStore((s) => s.reset)

	return (
		<div className='flex items-center gap-3'>
			<button
				type='button'
				onClick={decrement}
				className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				−
			</button>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
			<button
				type='button'
				onClick={increment}
				className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				+
			</button>
			<button
				type='button'
				onClick={reset}
				className='ml-2 rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground'
			>
				reset
			</button>
		</div>
	)
}

export default function CounterExample() {
	return (
		<counterStore.Provider defaultValue={{ initialCount: 0 }}>
			<CounterDisplay />
		</counterStore.Provider>
	)
}
