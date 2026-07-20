'use client'

import { useStoreState } from '@ez-kit/zu-store'
import { useMemo } from 'react'
import { createStore } from 'zustand/vanilla'

type FormState = {
	name: string
	age: number
}

function NameField({ store }: { store: ReturnType<typeof createFormStore> }) {
	const [name, setName] = useStoreState(store, 'name')
	return (
		<label className='flex flex-col gap-1 text-sm'>
			<span className='text-fd-muted-foreground'>Name</span>
			<input
				type='text'
				value={name}
				onChange={(e) => {
					setName(e.target.value)
				}}
				className='rounded-md border border-fd-border bg-fd-card px-2 py-1'
			/>
		</label>
	)
}

function AgeField({ store }: { store: ReturnType<typeof createFormStore> }) {
	const [age, setAge] = useStoreState(store, 'age')
	return (
		<label className='flex flex-col gap-1 text-sm'>
			<span className='text-fd-muted-foreground'>Age</span>
			<input
				type='number'
				value={age}
				onChange={(e) => {
					setAge(Number(e.target.value))
				}}
				className='w-24 rounded-md border border-fd-border bg-fd-card px-2 py-1'
			/>
		</label>
	)
}

function Summary({ store }: { store: ReturnType<typeof createFormStore> }) {
	const [name] = useStoreState(store, 'name')
	const [age] = useStoreState(store, 'age')
	return (
		<p className='text-sm text-fd-muted-foreground'>
			<span className='font-mono'>{name || '—'}</span> · <span className='font-mono'>{age}</span>
		</p>
	)
}

function createFormStore() {
	return createStore<FormState>()(() => ({ name: '', age: 0 }))
}

export default function FormExample() {
	const store = useMemo(() => createFormStore(), [])
	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-wrap items-end gap-3'>
				<NameField store={store} />
				<AgeField store={store} />
			</div>
			<Summary store={store} />
		</div>
	)
}
