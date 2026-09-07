'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'

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
		increment: () => {
			set({ count: get().count + 1 })
		},
		decrement: () => {
			set({ count: get().count - 1 })
		},
		reset: () => {
			set({ count: initialCount })
		},
	}))
})

function CounterDisplay() {
	const count = counterStore.useSelector((s) => s.count)
	const increment = counterStore.useSelector((s) => s.increment)
	const decrement = counterStore.useSelector((s) => s.decrement)
	const reset = counterStore.useSelector((s) => s.reset)

	return (
		<div className='flex items-center gap-3'>
			<Button
				variant='outline'
				size='icon-sm'
				aria-label='Decrement'
				onClick={decrement}
			>
				<MinusIcon />
			</Button>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
			<Button
				variant='outline'
				size='icon-sm'
				aria-label='Increment'
				onClick={increment}
			>
				<PlusIcon />
			</Button>
			<Button
				variant='ghost'
				size='sm'
				onClick={reset}
			>
				Reset
			</Button>
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
