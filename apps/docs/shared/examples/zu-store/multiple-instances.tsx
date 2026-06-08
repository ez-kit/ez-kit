'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand/vanilla'

type CounterState = {
	count: number
	increment: () => void
}

type CounterDefaultValue = {
	initialCount: number
	label: string
}

const counterStore = createContextStore(({ defaultValue }: ContextStoreInit<CounterDefaultValue>) =>
	createStore<CounterState>()((set, get) => ({
		count: defaultValue.initialCount,
		increment: () => { set({ count: get().count + 1 }); },
	})),
)

function Counter({ label }: { label: string }) {
	const count = counterStore.useStore((s) => s.count)
	const increment = counterStore.useStore((s) => s.increment)

	return (
		<div className='flex items-center gap-3 rounded-md border border-fd-border bg-fd-card p-3'>
			<span className='text-xs uppercase tracking-wider text-fd-muted-foreground'>{label}</span>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
			<button
				type='button'
				onClick={increment}
				className='rounded-md border border-fd-border bg-fd-background px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				+1
			</button>
		</div>
	)
}

export default function MultipleInstancesExample() {
	return (
		<div className='flex flex-col gap-3 sm:flex-row'>
			<counterStore.Provider defaultValue={{ initialCount: 0, label: 'left' }}>
				<Counter label='left' />
			</counterStore.Provider>
			<counterStore.Provider defaultValue={{ initialCount: 100, label: 'right' }}>
				<Counter label='right' />
			</counterStore.Provider>
		</div>
	)
}
