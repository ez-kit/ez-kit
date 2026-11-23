import { createContextStore, pipe } from '@ez-kit/zu-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/zu-store/persist'
import { localStorageField } from '@ez-kit/zu-store/persist/storage'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { createStore } from 'zustand/vanilla'

import { createMemoryUrlAdapter } from '../_memory-adapter'

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

export const listStore = createContextStore(() =>
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
		withPersist({ fields, restore: { externalChanges: 'apply' } }),
	),
)

export const url = createMemoryUrlAdapter('q=boots')
