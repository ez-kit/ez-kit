'use client'

import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, paramArray, paramEnum, paramString, withPersist } from '@ez-kit/zu-store/persist'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

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
	set: <K extends 'q' | 'page' | 'inStock' | 'tags' | 'sort'>(key: K, value: SearchState[K]) => void
}

// Primitives (`q`, `page`, `inStock`) auto-resolve their parser from the runtime value. Structured
// values need an explicit codec: an array of strings, a closed enum.
const fields: FieldsBuilder<SearchState> = (field) => [
	field((state) => state.q, urlField()),
	field((state) => state.page, urlField()),
	field((state) => state.inStock, urlField()),
	field((state) => state.tags, urlField({ parser: paramArray(paramString()) })),
	field((state) => state.sort, urlField({ parser: paramEnum<Sort>(['relevance', 'newest']) })),
]

const searchStore = createContextStore(() =>
	pipe(
		createStore<SearchState>()((set) => ({
			q: '',
			page: 1,
			inStock: false,
			tags: [],
			sort: 'relevance',
			set: (key, value) => {
				set({ [key]: value } as Partial<SearchState>)
			},
		})),
		withPersist({ fields }),
	),
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&tags=red,suede&sort=newest&page=2')

const ALL_TAGS = ['red', 'suede', 'sale', 'new']

function SearchControls() {
	const queryId = useId()
	const sortId = useId()
	const inStockId = useId()
	const q = searchStore.useSelector((state) => state.q)
	const sort = searchStore.useSelector((state) => state.sort)
	const inStock = searchStore.useSelector((state) => state.inStock)
	const tags = searchStore.useSelector((state) => state.tags)
	const set = searchStore.useSelector((state) => state.set)
	const search = useSearch()

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-32'
						value={q}
						placeholder='search…'
						onChange={(event) => {
							set('q', event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={sortId}>sort</Label>
					<NativeSelect
						id={sortId}
						size='sm'
						value={sort}
						onChange={(event) => {
							set('sort', event.target.value as Sort)
						}}
					>
						<NativeSelectOption value='relevance'>relevance</NativeSelectOption>
						<NativeSelectOption value='newest'>newest</NativeSelectOption>
					</NativeSelect>
				</div>
				<div className='flex items-center gap-2'>
					<Checkbox
						id={inStockId}
						checked={inStock}
						onCheckedChange={(checked) => {
							set('inStock', checked === true)
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
					value={tags}
					onValueChange={(next) => {
						set('tags', next)
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
		<StoreProvider persist={[adapter]}>
			<searchStore.Provider>
				<SearchControls />
			</searchStore.Provider>
		</StoreProvider>
	)
}
