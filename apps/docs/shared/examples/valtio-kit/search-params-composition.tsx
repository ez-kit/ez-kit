'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createFieldsStore, StoreSearchParamsProvider } from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type ProductFiltersState = {
	q: string
	price: { min: number; max: number }
	onSale: boolean
}

// Declared with the accessor API so the demo runs here; the decorator form composes a nested
// `class Price` and inherits via `extends` to produce the SAME paths: q, price.min, price.max, onSale.
const store = createFieldsStore<ProductFiltersState>(
	() => proxy<ProductFiltersState>({ q: '', price: { min: 0, max: 100 }, onSale: false }),
	(field) => [
		field((s) => s.q),
		field((s) => s.price.min),
		field((s) => s.price.max),
		field((s) => s.onSale),
	],
)

const { adapter, useSearch } = createMemoryAdapter('q=jacket&price.min=20&price.max=80&onSale=true')

function Controls() {
	const snap = store.useSnapshot()
	const state = store.useStore()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>q</span>
					<input
						value={snap.q}
						onChange={(event) => {
							state.q = event.target.value
						}}
						placeholder='search…'
						className='w-32 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>price.min</span>
					<input
						type='number'
						value={snap.price.min}
						onChange={(event) => {
							state.price.min = event.target.valueAsNumber || 0
						}}
						className='w-20 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>price.max</span>
					<input
						type='number'
						value={snap.price.max}
						onChange={(event) => {
							state.price.max = event.target.valueAsNumber || 0
						}}
						className='w-20 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						checked={snap.onSale}
						onChange={(event) => {
							state.onSale = event.target.checked
						}}
					/>
					<span className='text-fd-muted-foreground'>onSale</span>
				</label>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsCompositionExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<store.Provider>
				<Controls />
			</store.Provider>
		</StoreSearchParamsProvider>
	)
}
