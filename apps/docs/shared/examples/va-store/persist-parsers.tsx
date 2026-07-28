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
import { proxy } from 'valtio'

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
	const snap = searchStore.useSnapshot()
	const store = searchStore.useStore()
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
						className='w-32 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
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
						<option value='relevance'>relevance</option>
						<option value='newest'>newest</option>
					</select>
				</label>
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
			</div>
			<div className='mt-2 flex flex-wrap items-center gap-2 text-sm'>
				<span className='text-fd-muted-foreground'>tags</span>
				{ALL_TAGS.map((tag) => {
					const active = snap.tags.includes(tag)
					return (
						<button
							key={tag}
							type='button'
							onClick={() => {
								store.tags = active ? store.tags.filter((t) => t !== tag) : [...store.tags, tag]
							}}
							className={`rounded-full border px-2 py-0.5 text-xs ${
								active
									? 'border-fd-primary bg-fd-primary/10 text-fd-primary'
									: 'border-fd-border bg-fd-card hover:bg-fd-muted'
							}`}
						>
							{tag}
						</button>
					)
				})}
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
