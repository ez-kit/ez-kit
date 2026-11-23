import { createContextStore, pipe } from '@ez-kit/zu-store'
import { withPersist } from '@ez-kit/zu-store/persist'
import { createStore } from 'zustand/vanilla'

type Preferences = { theme: 'light' | 'dark'; fontScale: number }

export const prefs = createContextStore(
	() =>
		pipe(
			createStore<Preferences>()(() => ({ theme: 'light', fontScale: 1 })),
			withPersist({ fields: (field) => [field((s) => s.theme, {}), field((s) => s.fontScale, {})] }),
		),
	{ name: 'guide-preferences' },
)
