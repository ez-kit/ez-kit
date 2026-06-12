'use client'

import {
	createFieldsStore,
	paramArray,
	paramString,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { qs } from '@ez-kit/valtio-kit/search-params/encoders/qs'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type CatalogState = {
	q: string
	tags: string[]
	setQ: (value: string) => void
	toggleTag: (tag: string) => void
}

const ALL_TAGS = ['new', 'sale', 'popular'] as const

const catalogStore = createFieldsStore<CatalogState>(
	() => {
		const state = proxy<CatalogState>({
			q: '',
			tags: [],
			setQ: (value) => {
				state.q = value
			},
			toggleTag: (tag) => {
				state.tags = state.tags.includes(tag) ? state.tags.filter((value) => value !== tag) : [...state.tags, tag]
			},
		})
		return state
	},
	// The qs() layout serialises arrays/nesting with the `qs` library (tags[]=…), so multi-value
	// fields stay readable in the URL instead of being JSON-encoded.
	(field) => [field((s) => s.q, paramString()), field((s) => s.tags, paramArray(paramString()))],
	{ layout: qs() },
)

const { adapter, useSearch } = createMemoryAdapter('tags%5B0%5D=sale')

function CatalogControls() {
	const snap = catalogStore.useSnapshot()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<input
					value={snap.q}
					onChange={(event) => {
						snap.setQ(event.target.value)
					}}
					placeholder='search…'
					className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
				/>
				<div className='flex gap-2'>
					{ALL_TAGS.map((tag) => (
						<button
							key={tag}
							type='button'
							onClick={() => {
								snap.toggleTag(tag)
							}}
							className={`rounded-full border px-3 py-1 text-sm font-medium ${
								snap.tags.includes(tag)
									? 'border-fd-primary bg-fd-primary text-fd-primary-foreground'
									: 'border-fd-border bg-fd-card hover:bg-fd-muted'
							}`}
						>
							{tag}
						</button>
					))}
				</div>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsQsExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<catalogStore.Provider>
				<CatalogControls />
			</catalogStore.Provider>
		</StoreSearchParamsProvider>
	)
}
