'use client'

import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/zu-store/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/zu-store/persist/storage'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

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
	setQuery: (q: string) => void
	setDensity: (density: ListState['density']) => void
}

// One store, two sources. Each field picks where it syncs — `q` → URL, `density` → localStorage.
const fields: FieldsBuilder<ListState> = (field) => [
	field((state) => state.q, urlField()),
	field((state) => state.density, localStorageField()),
]

const listStore = createContextStore(() =>
	pipe(
		createStore<ListState>()((set) => ({
			q: '',
			density: 'comfortable',
			setQuery: (q) => {
				set({ q })
			},
			setDensity: (density) => {
				set({ density })
			},
		})),
		withPersist({ fields }),
	),
)

// Seed the URL with a shared link (?q=boots). Storage starts empty — first-present-wins means the
// shared `q` is never clobbered by a restored value.
const url = createMemoryUrlAdapter('q=boots')
const storage = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function ListControls() {
	const queryId = useId()
	const densityId = useId()
	const q = listStore.useSelector((state) => state.q)
	const density = listStore.useSelector((state) => state.density)
	const setQuery = listStore.useSelector((state) => state.setQuery)
	const setDensity = listStore.useSelector((state) => state.setDensity)
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
						value={q}
						placeholder='search…'
						onChange={(event) => {
							setQuery(event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={densityId}>density (storage)</Label>
					<NativeSelect
						id={densityId}
						size='sm'
						value={density}
						onChange={(event) => {
							setDensity(event.target.value as ListState['density'])
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
		<StoreProvider persist={[url.adapter, storage.adapter]}>
			<listStore.Provider>
				<ListControls />
			</listStore.Provider>
		</StoreProvider>
	)
}
