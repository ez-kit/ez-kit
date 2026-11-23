import { createContextStore, pipe } from '@ez-kit/zu-store'
import { withPersist } from '@ez-kit/zu-store/persist'
import { createStore } from 'zustand/vanilla'

export const panel = createContextStore(
	() =>
		pipe(
			createStore(() => ({ width: 320 })),
			withPersist({
				restore: { timeoutMs: 1500 },
				fields: (field) => [field((state) => state.width, {})],
			}),
		),
	{ name: 'guide-panel' },
)
