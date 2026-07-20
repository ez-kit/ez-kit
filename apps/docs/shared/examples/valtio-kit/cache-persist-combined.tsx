'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes the raw mutable proxy from useStore() */

import { createStoreCache, StoreProvider } from '@ez-kit/valtio-kit'
import { type FieldsBuilder, persist } from '@ez-kit/valtio-kit/persist'
import { urlField } from '@ez-kit/valtio-kit/persist/url'
import { useState } from 'react'
import { proxy } from 'valtio'

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
	const snap = filtersStore.useSnapshot()
	const store = filtersStore.useStore() // the raw mutable proxy
	const search = url.useSearch()

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
						className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<div className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>page</span>
					<button
						type='button'
						onClick={() => {
							store.page = Math.max(1, store.page - 1)
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						−
					</button>
					<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
					<button
						type='button'
						onClick={() => {
							store.page += 1
						}}
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

function Demo() {
	const [open, setOpen] = useState(true)

	return (
		<div className='flex flex-col gap-4'>
			<button
				type='button'
				onClick={() => {
					setOpen((on) => !on)
				}}
				className='self-start rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
			>
				{open ? 'Close panel' : 'Reopen panel'}
			</button>

			{open ? (
				<filtersStore.Provider id='main'>
					<FilterControls />
				</filtersStore.Provider>
			) : (
				<p className='rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground'>
					Panel closed. The filter store is kept alive in the cache and still mirrored to the URL — reopen it and your{' '}
					<code>q</code>/<code>page</code> are preserved.
				</p>
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
