'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createContextStore } from '@ez-kit/va-store'
import { type FieldsBuilder, persist, PersistProvider } from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
}

// The accessor API runs in this in-browser sandbox (no decorator transform needed). The decorator
// form — class Filters { @persistUrl() q = '' } — produces identical URL output. See Quick start → URL.
// Author the `fields` builder against the store type for typed selectors; `persist()` infers the state
// type from the surrounding `createContextStore<FiltersState>` call, so no cast is needed.
const fields: FieldsBuilder<FiltersState> = (field) => [field((s) => s.q, urlField()), field((s) => s.page, urlField())]

const filtersStore = createContextStore<FiltersState>(() => proxy<FiltersState>({ q: '', page: 1 }), {
	plugins: [persist({ fields })],
})

const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&page=2')

function FilterControls() {
	const queryId = useId()
	const snap = filtersStore.useSnapshot()
	const store = filtersStore.useStore() // the raw mutable proxy
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-40'
						value={snap.q}
						placeholder='search…'
						onChange={(event) => {
							store.q = event.target.value
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label>page</Label>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Previous page'
						onClick={() => {
							store.page = Math.max(1, store.page - 1)
						}}
					>
						<MinusIcon />
					</Button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Next page'
						onClick={() => {
							store.page += 1
						}}
					>
						<PlusIcon />
					</Button>
				</div>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistUrlExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<filtersStore.Provider>
				<FilterControls />
			</filtersStore.Provider>
		</PersistProvider>
	)
}
