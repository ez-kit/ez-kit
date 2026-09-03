'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createStore } from '@ez-kit/va-store'
import {
	type FieldsBuilder,
	paramArray,
	paramEnum,
	paramString,
	persist,
	PersistProvider,
} from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type Sort = 'relevance' | 'newest'

type SearchState = {
	q: string
	page: number
	inStock: boolean
	tags: string[]
	sort: Sort
}

// Primitives (`q`, `page`, `inStock`) auto-resolve their parser from the runtime value. Structured
// values need an explicit codec: an array of strings, a closed enum.
const fields: FieldsBuilder<SearchState> = (field) => [
	field((s) => s.q, urlField()),
	field((s) => s.page, urlField()),
	field((s) => s.inStock, urlField()),
	field((s) => s.tags, urlField({ parser: paramArray(paramString()) })),
	field((s) => s.sort, urlField({ parser: paramEnum<Sort>(['relevance', 'newest']) })),
]

const searchStore = createStore<SearchState>(
	() => proxy<SearchState>({ q: '', page: 1, inStock: false, tags: [], sort: 'relevance' }),
	{ plugins: [persist({ fields })] },
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&tags=red,suede&sort=newest&page=2')

const ALL_TAGS = ['red', 'suede', 'sale', 'new']

function SearchControls() {
	const queryId = useId()
	const sortId = useId()
	const inStockId = useId()
	const snap = searchStore.useSnapshot()
	const store = searchStore.useStore()
	const search = useSearch()

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-32'
						value={snap.q}
						placeholder='search…'
						onChange={(event) => {
							store.q = event.target.value
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={sortId}>sort</Label>
					<NativeSelect
						id={sortId}
						size='sm'
						value={snap.sort}
						onChange={(event) => {
							store.sort = event.target.value as Sort
						}}
					>
						<NativeSelectOption value='relevance'>relevance</NativeSelectOption>
						<NativeSelectOption value='newest'>newest</NativeSelectOption>
					</NativeSelect>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox
						id={inStockId}
						checked={snap.inStock}
						onCheckedChange={(checked) => {
							store.inStock = checked === true
						}}
					/>
					<Label htmlFor={inStockId}>inStock</Label>
				</div>
			</div>
			<div className='flex flex-wrap items-center gap-3'>
				<Label>tags</Label>
				<ToggleGroup
					type='multiple'
					variant='outline'
					size='sm'
					value={[...snap.tags]}
					onValueChange={(next) => {
						store.tags = next
					}}
				>
					{ALL_TAGS.map((tag) => (
						<ToggleGroupItem
							key={tag}
							value={tag}
						>
							{tag}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistParsersExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<searchStore.Provider>
				<SearchControls />
			</searchStore.Provider>
		</PersistProvider>
	)
}
