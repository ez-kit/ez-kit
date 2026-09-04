'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo shows the raw mutable proxy from useStore() */

import { createContextStore } from '@ez-kit/va-store'
import { type FieldsBuilder, PersistProvider, useHydrated, withPersist } from '@ez-kit/va-store/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/va-store/persist/storage'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

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

const prefsStore = createContextStore<PrefsState>(() =>
	withPersist(proxy<PrefsState>({ theme: 'light', fontScale: 1 }), { fields }),
)

const { adapter, useBlob } = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function PrefControls() {
	const themeId = useId()
	const snap = prefsStore.useSnapshot()
	const store = prefsStore.useStore() // the raw mutable proxy
	const hydrated = useHydrated(store) // standalone hook — pass the raw proxy
	const blob = useBlob()

	return (
		<div>
			<Badge
				variant={hydrated ? 'secondary' : 'outline'}
				className='mb-3'
			>
				{hydrated ? 'hydrated' : 'restoring…'}
			</Badge>
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={themeId}>theme</Label>
					<NativeSelect
						id={themeId}
						size='sm'
						value={snap.theme}
						onChange={(event) => {
							store.theme = event.target.value as PrefsState['theme']
						}}
					>
						<NativeSelectOption value='light'>light</NativeSelectOption>
						<NativeSelectOption value='dark'>dark</NativeSelectOption>
					</NativeSelect>
				</div>
				<div className='flex items-center gap-2'>
					<Label>fontScale</Label>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Decrease font scale'
						onClick={() => {
							store.fontScale = Math.max(0.5, Math.round((store.fontScale - 0.25) * 100) / 100)
						}}
					>
						<MinusIcon />
					</Button>
					<output className='min-w-[3ch] text-center font-mono tabular-nums'>{snap.fontScale}</output>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Increase font scale'
						onClick={() => {
							store.fontScale = Math.round((store.fontScale + 0.25) * 100) / 100
						}}
					>
						<PlusIcon />
					</Button>
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
