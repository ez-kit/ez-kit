'use client'

import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/zu-store/persist'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type ProductFiltersState = {
	q: string
	price: { min: number; max: number }
	onSale: boolean
	setQuery: (q: string) => void
	setPrice: (bound: 'min' | 'max', value: number) => void
	setOnSale: (onSale: boolean) => void
}

// Fields are addressed by path, so nested state maps to dotted keys: price.min, price.max. A URL pull
// rebuilds only the touched path — `price` gets a new reference, everything else keeps its own, so a
// selector reading `onSale` does not re-render when `price.min` arrives.
const fields: FieldsBuilder<ProductFiltersState> = (field) => [
	field((state) => state.q, urlField()),
	field((state) => state.price.min, urlField()),
	field((state) => state.price.max, urlField()),
	field((state) => state.onSale, urlField()),
]

const store = createContextStore(() =>
	pipe(
		createStore<ProductFiltersState>()((set) => ({
			q: '',
			price: { min: 0, max: 100 },
			onSale: false,
			setQuery: (q) => {
				set({ q })
			},
			// A nested write is an immutable update in Zustand — the same shape the persist port uses.
			setPrice: (bound, value) => {
				set((state) => ({ price: { ...state.price, [bound]: value } }))
			},
			setOnSale: (onSale) => {
				set({ onSale })
			},
		})),
		withPersist({ fields }),
	),
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=jacket&price.min=20&price.max=80&onSale=true')

function Controls() {
	const queryId = useId()
	const minId = useId()
	const maxId = useId()
	const onSaleId = useId()
	const q = store.useSelector((state) => state.q)
	const price = store.useSelector((state) => state.price)
	const onSale = store.useSelector((state) => state.onSale)
	const setQuery = store.useSelector((state) => state.setQuery)
	const setPrice = store.useSelector((state) => state.setPrice)
	const setOnSale = store.useSelector((state) => state.setOnSale)
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-32'
						value={q}
						placeholder='search…'
						onChange={(event) => {
							setQuery(event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={minId}>price.min</Label>
					<Input
						id={minId}
						type='number'
						className='w-20'
						value={price.min}
						onChange={(event) => {
							setPrice('min', event.target.valueAsNumber || 0)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={maxId}>price.max</Label>
					<Input
						id={maxId}
						type='number'
						className='w-20'
						value={price.max}
						onChange={(event) => {
							setPrice('max', event.target.valueAsNumber || 0)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox
						id={onSaleId}
						checked={onSale}
						onCheckedChange={(checked) => {
							setOnSale(checked === true)
						}}
					/>
					<Label htmlFor={onSaleId}>onSale</Label>
				</div>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistCompositionExample() {
	return (
		<StoreProvider persist={[adapter]}>
			<store.Provider>
				<Controls />
			</store.Provider>
		</StoreProvider>
	)
}
