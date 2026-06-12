'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createSearchParamsStore, paramString, StoreSearchParamsProvider } from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	category: string
	search: { query: string }
}

// Declared with the accessor API so the demo runs here; the decorator form uses
// @searchParam({ key: 'cat' }) and @searchParam({ key: 'q', absolute: true }) for the same result.
// `key` renames the leaf (category → ?cat); `absolute` pins a top-level key (search.query → ?q).
const store = createSearchParamsStore<FiltersState>(
	() => proxy<FiltersState>({ category: '', search: { query: '' } }),
	{
		fields: (field) => [
			field((s) => s.category, paramString(), { key: 'cat' }),
			field((s) => s.search.query, paramString(), { key: 'q', absolute: true }),
		],
	},
)

const { adapter, useSearch } = createMemoryAdapter('cat=boots&q=red')

function Controls() {
	const snap = store.useSnapshot()
	const state = store.useStore()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>category → ?cat</span>
					<input
						value={snap.category}
						onChange={(event) => {
							state.category = event.target.value
						}}
						placeholder='category…'
						className='w-32 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>search.query → ?q</span>
					<input
						value={snap.search.query}
						onChange={(event) => {
							state.search.query = event.target.value
						}}
						placeholder='query…'
						className='w-32 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsKeyPlacementExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<store.Provider>
				<Controls />
			</store.Provider>
		</StoreSearchParamsProvider>
	)
}
