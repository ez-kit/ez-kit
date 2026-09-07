'use client'

import { createContextStore, pipe } from '@ez-kit/zu-store'
import { type FieldsBuilder, PersistProvider, withPersist } from '@ez-kit/zu-store/persist'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
	setQuery: (q: string) => void
	setPage: (page: number) => void
}

// The `fields` builder is typed against the store's STATE, not its handle — a Zustand store is a
// handle, so `withPersist` reads the state type off it for you. Actions are just state that no
// field selects, so they are never persisted.
const fields: FieldsBuilder<FiltersState> = (field) => [
	field((state) => state.q, urlField()),
	field((state) => state.page, urlField()),
]

const filtersStore = createContextStore(() =>
	pipe(
		createStore<FiltersState>()((set) => ({
			q: '',
			page: 1,
			setQuery: (q) => {
				set({ q })
			},
			setPage: (page) => {
				set({ page: Math.max(1, page) })
			},
		})),
		withPersist({ fields }),
	),
)

const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&page=2')

function FilterControls() {
	const queryId = useId()
	const q = filtersStore.useSelector((state) => state.q)
	const page = filtersStore.useSelector((state) => state.page)
	const setQuery = filtersStore.useSelector((state) => state.setQuery)
	const setPage = filtersStore.useSelector((state) => state.setPage)
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-40'
						value={q}
						placeholder='search…'
						onChange={(event) => {
							setQuery(event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label>page</Label>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Previous page'
						onClick={() => {
							setPage(page - 1)
						}}
					>
						<MinusIcon />
					</Button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{page}</output>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Next page'
						onClick={() => {
							setPage(page + 1)
						}}
					>
						<PlusIcon />
					</Button>
				</div>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistUrlExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<filtersStore.Provider>
				<FilterControls />
			</filtersStore.Provider>
		</PersistProvider>
	)
}
