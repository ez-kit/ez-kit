import { createContextStore, pipe } from '@ez-kit/va-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/va-store/persist'
import { localStorageField } from '@ez-kit/va-store/persist/storage'
import { urlField } from '@ez-kit/va-store/persist/url'
import { proxy } from 'valtio'

import { createMemoryUrlAdapter } from '../_memory-adapter'

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

export const listStore = createContextStore<ListState>(() =>
	pipe(
		proxy<ListState>({ q: '', density: 'comfortable' }),
		withPersist({ fields, restore: { externalChanges: 'apply' } }),
	),
)

export const url = createMemoryUrlAdapter('q=boots')
