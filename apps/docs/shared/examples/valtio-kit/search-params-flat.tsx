'use client'

import {
	createSearchParamsStore,
	flat,
	paramNumber,
	paramString,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
	setQ: (value: string) => void
	incPage: () => void
	decPage: () => void
}

const filtersStore = createSearchParamsStore<FiltersState>(
	() => {
		const state = proxy<FiltersState>({
			q: '',
			page: 1,
			setQ: (value) => {
				state.q = value
			},
			incPage: () => {
				state.page += 1
			},
			decPage: () => {
				state.page = Math.max(1, state.page - 1)
			},
		})
		return state
	},
	{
		fields: (field) => [field((s) => s.q, paramString()), field((s) => s.page, paramNumber())],
		layout: flat(),
	},
)

const { adapter, useSearch } = createMemoryAdapter('q=boots&page=2')

function FilterControls() {
	const snap = filtersStore.useSnapshot()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>q</span>
					<input
						value={snap.q}
						onChange={(event) => {
							snap.setQ(event.target.value)
						}}
						placeholder='search…'
						className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<div className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>page</span>
					<button
						type='button'
						onClick={snap.decPage}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						−
					</button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
					<button
						type='button'
						onClick={snap.incPage}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						+
					</button>
				</div>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsFlatExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<filtersStore.Provider>
				<FilterControls />
			</filtersStore.Provider>
		</StoreSearchParamsProvider>
	)
}
