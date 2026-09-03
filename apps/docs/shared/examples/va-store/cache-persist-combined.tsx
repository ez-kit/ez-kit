'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes the raw mutable proxy from useStore() */

import { createStoreCache, StoreProvider } from '@ez-kit/va-store'
import { type FieldsBuilder, persist } from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { proxy } from 'valtio'

import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type FiltersState = {
	q: string
	page: number
}

// One isolated cache instance, threaded into the StoreProvider below.
const cache = createStoreCache()
const url = createMemoryUrlAdapter('q=boots&page=2')

const fields: FieldsBuilder<FiltersState> = (field) => [field((s) => s.q, urlField()), field((s) => s.page, urlField())]

// BOTH cached AND persisted: the `persist()` plugin syncs the fields to the URL engine, while the
// cache keeps the live proxy alive across unmount/remount. A cache-hit returns the same already-bound
// proxy, so its URL binding (and in-progress edits) survive a remount within `gcTime`.
const filtersStore = cache.createCachedStore<FiltersState>(() => proxy<FiltersState>({ q: '', page: 1 }), {
	name: 'cached-filters',
	plugins: [persist({ fields })],
})

function FilterControls() {
	const queryId = useId()
	const snap = filtersStore.useSnapshot()
	const store = filtersStore.useStore() // the raw mutable proxy
	const search = url.useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q</Label>
					<Input
						id={queryId}
						className='w-40'
						value={snap.q}
						placeholder='search…'
						onChange={(event) => {
							store.q = event.target.value
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
							store.page = Math.max(1, store.page - 1)
						}}
					>
						<MinusIcon />
					</Button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Next page'
						onClick={() => {
							store.page += 1
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
