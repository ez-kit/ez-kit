'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import {
	createFieldsStore,
	paramEnum,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type Sort = 'asc' | 'desc'

type FiltersState = {
	q: string
	page: number
	inStock: boolean
	sort: Sort
}

// Declared with the accessor API so the demo runs in this in-browser sandbox; the decorator form
// (class Filters { @searchParam() q = ''; … }) produces identical URL output. See the Fields page.
const filtersStore = createFieldsStore<FiltersState>(
	() => proxy<FiltersState>({ q: '', page: 1, inStock: false, sort: 'asc' }),
	(field) => [
		field((s) => s.q),
		field((s) => s.page),
		field((s) => s.inStock),
		field((s) => s.sort, paramEnum<Sort>(['asc', 'desc'])),
	],
)

const { adapter, useSearch } = createMemoryAdapter('q=boots&page=2')

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
						className='w-36 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
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
				<label className='flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						checked={snap.inStock}
						onChange={(event) => {
							store.inStock = event.target.checked
						}}
					/>
					<span className='text-fd-muted-foreground'>inStock</span>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>sort</span>
					<select
						value={snap.sort}
						onChange={(event) => {
							store.sort = event.target.value as Sort
						}}
						className='rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					>
						<option value='asc'>asc</option>
						<option value='desc'>desc</option>
					</select>
				</label>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsDecoratorsExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<filtersStore.Provider>
				<FilterControls />
			</filtersStore.Provider>
		</StoreSearchParamsProvider>
	)
}
