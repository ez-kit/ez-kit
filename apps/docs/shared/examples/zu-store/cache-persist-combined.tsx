'use client'

import { createStoreCache, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/zu-store/persist'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
	setQuery: (q: string) => void
	setPage: (page: number) => void
}

// One isolated cache instance, threaded into the StoreProvider below.
const cache = createStoreCache()
const url = createMemoryUrlAdapter('q=boots&page=2')

const fields: FieldsBuilder<FiltersState> = (field) => [
	field((state) => state.q, urlField()),
	field((state) => state.page, urlField()),
]

// BOTH cached AND persisted: the persist capability syncs the fields to the URL engine, while the
// cache keeps the live store alive across unmount/remount. A cache-hit returns the same already-bound
// store, so its URL binding (and in-progress edits) survive a remount within `gcTime`.
const filtersStore = cache.createCachedStore(
	() =>
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
	{ name: 'cached-filters' },
)

function FilterControls() {
	const queryId = useId()
	const q = filtersStore.useSelector((state) => state.q)
	const page = filtersStore.useSelector((state) => state.page)
	const setQuery = filtersStore.useSelector((state) => state.setQuery)
	const setPage = filtersStore.useSelector((state) => state.setPage)
	const search = url.useSearch()

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

function Demo() {
	const [open, setOpen] = useState(true)

	return (
		<div className='flex flex-col gap-4'>
			<Button
				variant='outline'
				size='sm'
				className='self-start'
				onClick={() => {
					setOpen((on) => !on)
				}}
			>
				{open ? 'Close panel' : 'Reopen panel'}
			</Button>

			{open ? (
				<filtersStore.Provider id='main'>
					<FilterControls />
				</filtersStore.Provider>
			) : (
				<Empty className='border'>
					<EmptyTitle>Panel closed</EmptyTitle>
					<EmptyDescription>
						The filter store is kept alive in the cache and still mirrored to the URL — reopen it and your{' '}
						<code>q</code>/<code>page</code> are preserved.
					</EmptyDescription>
				</Empty>
			)}
		</div>
	)
}

export default function CachePersistCombinedExample() {
	// One StoreProvider mounts both the persist engines (from `persist`) and the cache (from `cache`).
	return (
		<StoreProvider
			persist={[url.adapter]}
			cache={cache}
		>
			<Demo />
		</StoreProvider>
	)
}
