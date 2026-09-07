'use client'

import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, useHydrated, withPersist } from '@ez-kit/zu-store/persist'
import { LOCAL_STORAGE_SOURCE, localStorageField } from '@ez-kit/zu-store/persist/storage'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { BlobReadout, createMemoryStorageAdapter } from './_memory-storage'

type PrefsState = {
	theme: 'light' | 'dark'
	fontScale: number
	setTheme: (theme: PrefsState['theme']) => void
	scaleBy: (delta: number) => void
}

// Same store shape as the URL quick start — only the field source changes. Persisted to (isolated,
// in-memory) localStorage here; in a real app swap in `localStorageAdapter()`.
const fields: FieldsBuilder<PrefsState> = (field) => [
	field((state) => state.theme, localStorageField()),
	field((state) => state.fontScale, localStorageField()),
]

const prefsStore = createContextStore(() =>
	pipe(
		createStore<PrefsState>()((set, get) => ({
			theme: 'light',
			fontScale: 1,
			setTheme: (theme) => {
				set({ theme })
			},
			scaleBy: (delta) => {
				set({ fontScale: Math.max(0.5, Math.round((get().fontScale + delta) * 100) / 100) })
			},
		})),
		withPersist({ fields }),
	),
)

const { adapter, useBlob } = createMemoryStorageAdapter(LOCAL_STORAGE_SOURCE)

function PrefControls() {
	const themeId = useId()
	const theme = prefsStore.useSelector((state) => state.theme)
	const fontScale = prefsStore.useSelector((state) => state.fontScale)
	const setTheme = prefsStore.useSelector((state) => state.setTheme)
	const scaleBy = prefsStore.useSelector((state) => state.scaleBy)
	// Standalone hook — pass the store handle from `useStore()`, the same one `withPersist` bound.
	const hydrated = useHydrated(prefsStore.useStore())
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
						value={theme}
						onChange={(event) => {
							setTheme(event.target.value as PrefsState['theme'])
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
							scaleBy(-0.25)
						}}
					>
						<MinusIcon />
					</Button>
					<output className='min-w-[3ch] text-center font-mono tabular-nums'>{fontScale}</output>
					<Button
						variant='outline'
						size='icon-sm'
						aria-label='Increase font scale'
						onClick={() => {
							scaleBy(0.25)
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
		<StoreProvider persist={[adapter]}>
			<prefsStore.Provider>
				<PrefControls />
			</prefsStore.Provider>
		</StoreProvider>
	)
}
