'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useContextStore() */

import { createStore } from '@ez-kit/valtio-kit'
import { type FieldsBuilder, persist, PersistProvider, useHydrated } from '@ez-kit/valtio-kit/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/valtio-kit/persist/storage'
import { proxy } from 'valtio'

import { BlobReadout, createMemoryStorageAdapter } from './_memory-storage'

type PrefsState = {
	theme: 'light' | 'dark'
	fontScale: number
}

// Same store shape as the URL quick start — only the field source changes. Persisted to (isolated,
// in-memory) localStorage here; in a real app swap in `localStorageAdapter()`.
const fields: FieldsBuilder<PrefsState> = (field) => [
	field((s) => s.theme, localStorageField()),
	field((s) => s.fontScale, localStorageField()),
]

const prefsStore = createStore<PrefsState>(() => proxy<PrefsState>({ theme: 'light', fontScale: 1 }), {
	plugins: [persist({ fields })],
})

const { adapter, useBlob } = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function PrefControls() {
	const snap = prefsStore.useSnapshot()
	const store = prefsStore.useContextStore() // the raw mutable proxy
	const hydrated = useHydrated(store) // standalone hook — pass the raw proxy
	const blob = useBlob()

	return (
		<div>
			<div className='mb-2 flex items-center gap-2 text-xs'>
				<span
					className={`inline-block size-2 rounded-full ${hydrated ? 'bg-green-500' : 'bg-amber-500'}`}
					aria-hidden
				/>
				<span className='text-fd-muted-foreground'>{hydrated ? 'hydrated' : 'restoring…'}</span>
			</div>
			<div className='flex flex-wrap items-center gap-3'>
				<label className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>theme</span>
					<select
						value={snap.theme}
						onChange={(event) => {
							store.theme = event.target.value as PrefsState['theme']
						}}
						className='rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
					>
						<option value='light'>light</option>
						<option value='dark'>dark</option>
					</select>
				</label>
				<div className='flex items-center gap-2 text-sm'>
					<span className='text-fd-muted-foreground'>fontScale</span>
					<button
						type='button'
						onClick={() => {
							store.fontScale = Math.max(0.5, Math.round((store.fontScale - 0.25) * 100) / 100)
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						−
					</button>
					<output className='min-w-[3ch] text-center font-mono tabular-nums'>{snap.fontScale}</output>
					<button
						type='button'
						onClick={() => {
							store.fontScale = Math.round((store.fontScale + 0.25) * 100) / 100
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 font-medium hover:bg-fd-muted'
					>
						+
					</button>
				</div>
			</div>
			<BlobReadout blob={blob} />
		</div>
	)
}

export default function PersistStorageExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<prefsStore.Provider>
				<PrefControls />
			</prefsStore.Provider>
		</PersistProvider>
	)
}
