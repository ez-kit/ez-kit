'use client'

import { useStoreState } from '@ez-kit/zu-store'
import { useId, useMemo } from 'react'
import { createStore } from 'zustand/vanilla'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormState = {
	name: string
	age: number
}

function NameField({ store }: { store: ReturnType<typeof createFormStore> }) {
	const id = useId()
	const [name, setName] = useStoreState(store, 'name')
	return (
		<div className='grid gap-1.5'>
			<Label htmlFor={id}>Name</Label>
			<Input
				id={id}
				value={name}
				onChange={(e) => {
					setName(e.target.value)
				}}
			/>
		</div>
	)
}

function AgeField({ store }: { store: ReturnType<typeof createFormStore> }) {
	const id = useId()
	const [age, setAge] = useStoreState(store, 'age')
	return (
		<div className='grid gap-1.5'>
			<Label htmlFor={id}>Age</Label>
			<Input
				id={id}
				type='number'
				className='w-24'
				value={age}
				onChange={(e) => {
					setAge(Number(e.target.value))
				}}
			/>
		</div>
	)
}

function Summary({ store }: { store: ReturnType<typeof createFormStore> }) {
	const [name] = useStoreState(store, 'name')
	const [age] = useStoreState(store, 'age')
	return (
		<p className='text-sm text-muted-foreground'>
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
