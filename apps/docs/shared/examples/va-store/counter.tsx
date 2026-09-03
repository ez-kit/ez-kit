'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/va-store'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { proxy } from 'valtio'

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
			<Button
				variant='outline'
				size='icon-sm'
				aria-label='Decrement'
				onClick={snap.decrement}
			>
				<MinusIcon />
			</Button>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{snap.count}</output>
			<Button
				variant='outline'
				size='icon-sm'
				aria-label='Increment'
				onClick={snap.increment}
			>
				<PlusIcon />
			</Button>
			<Button
				variant='ghost'
				size='sm'
				onClick={snap.reset}
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
