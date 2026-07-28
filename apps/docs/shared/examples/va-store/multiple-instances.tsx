'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/va-store'
import { proxy } from 'valtio'

type CounterState = {
	count: number
	increment: () => void
}

type CounterDefaultValue = {
	initialCount: number
}

const counterStore = createContextStore(({ defaultValue }: ContextStoreInit<CounterDefaultValue>) => {
	const state = proxy<CounterState>({
		count: defaultValue.initialCount,
		increment: () => {
			state.count += 1
		},
	})

	return state
})

function Counter({ label }: { label: string }) {
	const snap = counterStore.useSnapshot()

	return (
		<div className='flex items-center gap-3 rounded-md border border-fd-border bg-fd-card p-3'>
			<span className='text-xs uppercase tracking-wider text-fd-muted-foreground'>{label}</span>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{snap.count}</output>
			<button
				type='button'
				onClick={snap.increment}
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
			<counterStore.Provider defaultValue={{ initialCount: 0 }}>
				<Counter label='left' />
			</counterStore.Provider>
			<counterStore.Provider defaultValue={{ initialCount: 100 }}>
				<Counter label='right' />
			</counterStore.Provider>
		</div>
	)
}
