'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createContextStore } from '@ez-kit/va-store'
import { type FieldsBuilder, PersistProvider, withPersist } from '@ez-kit/va-store/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/va-store/persist/storage'
import { urlField } from '@ez-kit/va-store/persist/url'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

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

const listStore = createContextStore<ListState>(() =>
	withPersist(proxy<ListState>({ q: '', density: 'comfortable' }), { fields }),
)

// Seed the URL with a shared link (?q=boots). Storage starts empty — first-present-wins means the
// shared `q` is never clobbered by a restored value.
const url = createMemoryUrlAdapter('q=boots')
const storage = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function ListControls() {
	const queryId = useId()
	const densityId = useId()
	const snap = listStore.useSnapshot()
	const store = listStore.useStore()
	const search = url.useSearch()
	const blob = storage.useBlob()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={queryId}>q (URL)</Label>
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
					<Label htmlFor={densityId}>density (storage)</Label>
					<NativeSelect
						id={densityId}
						size='sm'
						value={snap.density}
						onChange={(event) => {
							store.density = event.target.value as ListState['density']
						}}
					>
						<NativeSelectOption value='comfortable'>comfortable</NativeSelectOption>
						<NativeSelectOption value='compact'>compact</NativeSelectOption>
					</NativeSelect>
				</div>
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
