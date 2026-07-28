'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createStore } from '@ez-kit/valtio-kit'
import { type FieldsBuilder, persist, PersistProvider } from '@ez-kit/valtio-kit/persist'
import { urlField } from '@ez-kit/valtio-kit/persist/url'
import { proxy } from 'valtio'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type ProductFiltersState = {
	q: string
	price: { min: number; max: number }
	onSale: boolean
}

// Fields are addressed by path, so nested state maps to dotted keys: price.min, price.max. A URL pull
// assigns only the leaf — the `price` object keeps its identity. The decorator form composes a nested
// `class Price` to the same paths.
const fields: FieldsBuilder<ProductFiltersState> = (field) => [
	field((s) => s.q, urlField()),
	field((s) => s.price.min, urlField()),
	field((s) => s.price.max, urlField()),
	field((s) => s.onSale, urlField()),
]

const store = createStore<ProductFiltersState>(
	() => proxy<ProductFiltersState>({ q: '', price: { min: 0, max: 100 }, onSale: false }),
	{ plugins: [persist({ fields })] },
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=jacket&price.min=20&price.max=80&onSale=true')

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

export default function PersistCompositionExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<store.Provider>
				<Controls />
			</store.Provider>
		</PersistProvider>
	)
}
