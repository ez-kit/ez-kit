'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createStore } from '@ez-kit/va-store'
import { type FieldsBuilder, persist, PersistProvider } from '@ez-kit/va-store/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/va-store/persist/storage'
import { urlField } from '@ez-kit/va-store/persist/url'
import { proxy } from 'valtio'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'
import { BlobReadout, createMemoryStorageAdapter } from './_memory-storage'

type ListState = {
	// Shared/explicit: lives in the URL so it deep-links and survives Back/forward.
	q: string
	// Personal/device preference: restored from storage, not worth putting in a shareable link.
	density: 'comfortable' | 'compact'
}

// One proxy, two sources. Each field picks where it syncs — `q` → URL, `density` → localStorage.
const fields: FieldsBuilder<ListState> = (field) => [
	field((s) => s.q, urlField()),
	field((s) => s.density, localStorageField()),
]

const listStore = createStore<ListState>(() => proxy<ListState>({ q: '', density: 'comfortable' }), {
	plugins: [persist({ fields })],
})

// Seed the URL with a shared link (?q=boots). Storage starts empty — first-present-wins means the
// shared `q` is never clobbered by a restored value.
const url = createMemoryUrlAdapter('q=boots')
const storage = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function ListControls() {
	const snap = listStore.useSnapshot()
	const store = listStore.useStore()
	const search = url.useSearch()
	const blob = storage.useBlob()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>q (URL)</span>
					<input
						value={snap.q}
						onChange={(event) => {
							store.q = event.target.value
						}}
						placeholder='search…'
						className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					/>
				</label>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>density (storage)</span>
					<select
						value={snap.density}
						onChange={(event) => {
							store.density = event.target.value as ListState['density']
						}}
						className='rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					>
						<option value='comfortable'>comfortable</option>
						<option value='compact'>compact</option>
					</select>
				</label>
			</div>
			<UrlReadout search={search} />
			<BlobReadout blob={blob} />
		</div>
	)
}

export default function PersistCombinedExample() {
	return (
		<PersistProvider adapters={[url.adapter, storage.adapter]}>
			<listStore.Provider>
				<ListControls />
			</listStore.Provider>
		</PersistProvider>
	)
}
