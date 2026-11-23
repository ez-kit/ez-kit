import { createContextStore, pipe } from '@ez-kit/va-store'
import { withPersist } from '@ez-kit/va-store/persist'
import { proxy } from 'valtio'

type Preferences = { theme: 'light' | 'dark'; fontScale: number }

export const prefs = createContextStore(
	() =>
		pipe(
			proxy<Preferences>({ theme: 'light', fontScale: 1 }),
			withPersist({ fields: (field) => [field((s) => s.theme, {}), field((s) => s.fontScale, {})] }),
		),
	{ name: 'guide-preferences' },
)
