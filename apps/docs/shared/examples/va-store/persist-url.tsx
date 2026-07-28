'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createStore } from '@ez-kit/va-store'
import { type FieldsBuilder, persist, PersistProvider } from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { proxy } from 'valtio'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
}

// The accessor API runs in this in-browser sandbox (no decorator transform needed). The decorator
// form — class Filters { @persistUrl() q = '' } — produces identical URL output. See Quick start → URL.
// Author the `fields` builder against the store type for typed selectors; `persist()` infers the state
// type from the surrounding `createStore<FiltersState>` call, so no cast is needed.
const fields: FieldsBuilder<FiltersState> = (field) => [field((s) => s.q, urlField()), field((s) => s.page, urlField())]

const filtersStore = createStore<FiltersState>(() => proxy<FiltersState>({ q: '', page: 1 }), {
	plugins: [persist({ fields })],
})

const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&page=2')

function FilterControls() {
	const snap = filtersStore.useSnapshot()
	const store = filtersStore.useStore() // the raw mutable proxy
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>q</span>
					<input
						value={snap.q}
						onChange={(event) => {
							store.q = event.target.value
						}}
						placeholder='search…'
						className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<div className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>page</span>
					<button
						type='button'
						onClick={() => {
							store.page = Math.max(1, store.page - 1)
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						−
					</button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
					<button
						type='button'
						onClick={() => {
							store.page += 1
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						+
					</button>
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
