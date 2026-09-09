'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/va-store'
import { proxy } from 'valtio'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
		<Card
			size='sm'
			className='flex-row items-center gap-3 px-4'
		>
			<Badge variant='secondary'>{label}</Badge>
			<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{snap.count}</output>
			<Button
				variant='outline'
				size='sm'
				onClick={snap.increment}
			>
				+1
			</Button>
		</Card>
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
