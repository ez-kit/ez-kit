'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createContextStore } from '@ez-kit/va-store'
import { type FieldsBuilder, PersistProvider, withPersist } from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

const store = createContextStore<ProductFiltersState>(() =>
	withPersist(proxy<ProductFiltersState>({ q: '', price: { min: 0, max: 100 }, onSale: false }), { fields }),
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=jacket&price.min=20&price.max=80&onSale=true')

function Controls() {
	const queryId = useId()
	const minId = useId()
	const maxId = useId()
	const onSaleId = useId()
	const snap = store.useSnapshot()
	const state = store.useStore()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-32'
						value={snap.q}
						placeholder='search…'
						onChange={(event) => {
							state.q = event.target.value
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={minId}>price.min</Label>
					<Input
						id={minId}
						type='number'
						className='w-20'
						value={snap.price.min}
						onChange={(event) => {
							state.price.min = event.target.valueAsNumber || 0
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={maxId}>price.max</Label>
					<Input
						id={maxId}
						type='number'
						className='w-20'
						value={snap.price.max}
						onChange={(event) => {
							state.price.max = event.target.valueAsNumber || 0
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox
						id={onSaleId}
						checked={snap.onSale}
						onCheckedChange={(checked) => {
							state.onSale = checked === true
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
		<PersistProvider adapters={[adapter]}>
			<store.Provider>
				<Controls />
			</store.Provider>
		</PersistProvider>
	)
}
