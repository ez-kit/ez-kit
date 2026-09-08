'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
		increment: () => {
			set({ count: get().count + 1 })
		},
	})),
)

function Counter({ label }: { label: string }) {
	const count = counterStore.useSelector((s) => s.count)
	const increment = counterStore.useSelector((s) => s.increment)

	return (
		<Card
			size='sm'
			className='flex-row items-center gap-3 px-4'
		>
			<Badge variant='secondary'>{label}</Badge>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
			<Button
				variant='outline'
				size='sm'
				onClick={increment}
			>
				+1
			</Button>
		</Card>
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
