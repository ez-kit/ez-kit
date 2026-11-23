'use client'

import { flushPersist } from '@ez-kit/zu-store/persist'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { UrlReadout } from '../_memory-adapter'

import { listStore, url } from './store'

export function ListControls() {
	const queryId = useId()
	const densityId = useId()
	const q = listStore.useSelector((state) => state.q)
	const density = listStore.useSelector((state) => state.density)
	const setQuery = listStore.useSelector((state) => state.setQuery)
	const setDensity = listStore.useSelector((state) => state.setDensity)
	const store = listStore.useStore()
	const search = url.useSearch()
	const [result, setResult] = useState('')

	async function save() {
		const outcomes = await flushPersist(store)
		setResult(
			Object.entries(outcomes)
				.map(([source, outcome]) => `${source}: ${outcome.status === 'fulfilled' ? 'saved' : 'failed'}`)
				.join(' · '),
		)
	}

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q (URL)</Label>
					<Input
						id={queryId}
						className='w-40'
						value={q}
						placeholder='search…'
						onChange={(event) => {
							setQuery(event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={densityId}>density (storage)</Label>
					<NativeSelect
						id={densityId}
						size='sm'
						value={density}
						onChange={(event) => {
							setDensity(event.target.value === 'compact' ? 'compact' : 'comfortable')
						}}
					>
						<NativeSelectOption value='comfortable'>comfortable</NativeSelectOption>
						<NativeSelectOption value='compact'>compact</NativeSelectOption>
					</NativeSelect>
				</div>
			</div>
			<UrlReadout search={search} />
			<div className='mt-3 flex flex-wrap items-center gap-3'>
				<Button
					type='button'
					variant='outline'
					onClick={() => void save()}
				>
					Save both sources
				</Button>
				<output aria-live='polite'>{result}</output>
			</div>
		</div>
	)
}
